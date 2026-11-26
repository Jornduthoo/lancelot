// Taken geven en opvolgen op de pc van de leerkracht.
// Kies een oefenblad of quiz, tik de leerlingen aan (of kies snel: hele klas, een kleur of een groepje uit het zorgoverzicht)
// en geef de taak. Daaronder zie je live per leerling: nog niet begonnen, bezig of klaar, met de score.
const socket = io({ query: { role: 'host' } });
KlasKiezer.start(socket, document.getElementById('klaskiezer'));
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
// Eén keer een opmaak maken (veel sneller dan toLocaleDateString per kaart, 26 nov).
const DATUM = new Intl.DateTimeFormat('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });
const datum = iso => DATUM.format(new Date(iso));

const TK_TAB = 'lancelot-tk-tab';
const tk = { soort: 'oefenblad', bronnen: null, meer: null, klas: [], gekozen: new Set(), per: {}, eigen: null, vak: null, zorg: null, taken: [], detail: null, erbij: null, vb: null };

// Komt de leerkracht van het zorgoverzicht of een lijst, dan staat de keuze al klaar (?namen=a|b, ?soort=…&file=…).
const vraag = new URLSearchParams(location.search);
if (['quiz', 'proef'].includes(vraag.get('soort'))) tk.soort = vraag.get('soort');
for (const n of (vraag.get('namen') || '').split('|').filter(Boolean)) tk.gekozen.add(n);
// Uit Opvolgen › Punten (↻ Herkansing geven): de nieuwe taak telt als herkansing van die toets.
tk.herkansing = vraag.get('soort') === 'proef' && vraag.get('herkansing') || null;
if (tk.herkansing) {
  const info = el('p', 'muted small tk-herk-info', `🔁 Deze taak telt als herkansing (Opvolgen › Punten). `);
  const weg = el('button', 'link', 'Geen herkansing');
  weg.type = 'button';
  weg.addEventListener('click', () => { tk.herkansing = null; info.remove(); });
  info.append(weg);
  document.querySelector('.tk-soort').after(info);
}

// Uit een les in De Zonnewijzer (?week=…&slot=…): de taak krijgt het doel en de succescriteria van die les mee.
tk.les = null;
function zetLes(les, start) {
  tk.les = les || null;
  $('tk-les').classList.toggle('hidden', !tk.les);
  zetLesStart(tk.les && start);
  if (!tk.les) return;
  $('tk-les-titel').textContent = `🎯 Voor de les: ${[tk.les.vak, tk.les.titel].filter(Boolean).join(' · ')}`;
  $('tk-les-doel').textContent = tk.les.doel || tk.les.criteria.join(' · ');
}
if (vraag.get('week') && vraag.get('slot')) {
  socket.emit('tk-les', { week: vraag.get('week'), slot: vraag.get('slot') }, res => zetLes(res && res.les, res && res.start));
}
$('tk-les-weg').addEventListener('click', () => zetLes(null));

// ---------- Wanneer? ----------
// Meteen, bij het begin van de les (uit De Zonnewijzer) of later op een gekozen dag en uur.
// Een geplande taak staat al bij Gegeven taken, maar de leerlingen zien ze pas vanaf dat moment.
const lokaal = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const wanneerTekst = v => new Date(v).toLocaleString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
tk.lesStart = '';
function zetLesStart(start) {
  tk.lesStart = start && Date.parse(start) > Date.now() ? start : '';
  const o = $('tk-wanneer-les');
  o.classList.toggle('hidden', !tk.lesStart);
  o.disabled = !tk.lesStart;
  if (tk.lesStart) {
    o.textContent = `Bij het begin van de les (${wanneerTekst(tk.lesStart)})`;
    $('tk-wanneer').value = 'les';
  } else if ($('tk-wanneer').value === 'les') $('tk-wanneer').value = 'nu';
  wanneer();
}
function wanneer() {
  const later = $('tk-wanneer').value === 'later';
  $('tk-vanaf-label').classList.toggle('hidden', !later);
  $('tk-vanaf').min = lokaal(new Date());
  // Standaard de volgende schooldag op je startuur (Instellingen › Taken, anders half negen).
  if (later && !$('tk-vanaf').value) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    const [u, m] = String((typeof standaard === 'function' && standaard() || {}).startuur || '08:30').split(':').map(Number);
    d.setHours(u, m, 0, 0);
    $('tk-vanaf').value = lokaal(d);
  }
}
$('tk-wanneer').addEventListener('change', () => { wanneer(); stdInfo(); });
// Standaardkeuzes (Instellingen › Taken): voorlezen, volgorde, punten tonen, verbeteren en startuur, per vak.
// Wat je hier zelf verandert, blijft staan tot je een taak gaf (ook als je een andere toets kiest).
const STD_VELDEN = { voorlees: 'tk-voorlees', volgorde: 'tk-volgorde', uitslag: 'tk-uitslag', beveiligd: 'tk-beveiligd', feedback: 'tk-feedback' };
tk.std = null;
tk.zelf = new Set();
for (const [k, id] of Object.entries(STD_VELDEN)) $(id).addEventListener('change', () => { tk.zelf.add(k); stdInfo(); });
function standaard() {
  const d = tk.std;
  if (!d) return null;
  const g = tk.vak && d.vakgroepen.find(x => (VAK_GROEP[x.id] || []).includes(tk.vak));
  return { ...d.algemeen, ...(g && d.vakken[g.id] ? d.vakken[g.id] : {}), vak: g && d.vakken[g.id] ? g.naam : '' };
}
// Welke vakken bij een vakgroep horen (zoals in src/niveaus.js).
const VAK_GROEP = { wiskunde: ['Wiskunde'], nederlands: ['Nederlands'], frans: ['Frans'], wo: ['Aardrijkskunde', 'Geschiedenis', 'Wetenschap en techniek'] };
function pasStandaardToe() {
  const s = standaard();
  if (!s) return;
  for (const [k, id] of Object.entries(STD_VELDEN)) {
    if (tk.zelf.has(k) || s[k] === undefined) continue;
    if (k === 'uitslag' || k === 'beveiligd') $(id).checked = !!s[k]; else $(id).value = s[k];
  }
  stdInfo();
}
const STD_TEKST = {
  voorlees: { uit: 'niet voorlezen', page: 'voorlezen voor Page', iedereen: 'voorlezen voor iedereen' },
  volgorde: { schud: 'alles door elkaar', vragen: 'vragen in volgorde', alles: 'alles in volgorde' },
  feedback: { direct: 'meteen verbeteren', inleveren: 'verbeteren na het inleveren' },
};
function stdInfo() {
  const s = standaard();
  const box = $('tk-standaard-info');
  if (!s || !$('tk-bron').value) { box.innerHTML = ''; return; }
  const delen = tk.soort === 'proef'
    ? [STD_TEKST.voorlees[s.voorlees], STD_TEKST.volgorde[s.volgorde], s.uitslag ? 'punten meteen tonen' : 'punten na het verbeteren', s.beveiligd === false ? 'niet op volledig scherm' : 'volledig scherm']
    : tk.soort === 'oefenblad' ? [STD_TEKST.feedback[s.feedback], STD_TEKST.voorlees[s.voorlees], s.uitslag ? 'punten tonen na het inleveren' : 'geen punten tonen'] : [];
  if ($('tk-wanneer').value === 'later') delen.push(`start om ${s.startuur}`);
  const anders = [...tk.zelf].filter(k => (k === 'feedback' ? tk.soort === 'oefenblad' : k === 'volgorde' || k === 'beveiligd' ? tk.soort === 'proef' : tk.soort !== 'quiz')).length;
  box.innerHTML = '';
  if (!delen.length) return;
  box.append(`⚙️ ${s.vak ? `Volgens je standaard voor ${s.vak}` : 'Volgens je standaard'}: ${delen.join(', ')}${anders ? ' (je veranderde hier iets)' : ''}. `);
  const a = el('a', '', 'Aanpassen');
  a.href = `/host?instellingen=taken&terug=${encodeURIComponent('/taken')}`;
  box.append(a);
}
socket.emit('tk-standaard', null, r => {
  if (!r || r.error) return;
  tk.std = r;
  pasStandaardToe();
});
socket.on('tk-standaard', r => { if (r && !r.error) { tk.std = r; pasStandaardToe(); } });
// Uit de toetsenlijst met 📅 Plannen (?wanneer=later): de keuze "Later" staat al klaar, met morgen half negen.
if (vraag.get('wanneer') === 'later') { $('tk-wanneer').value = 'later'; wanneer(); }
function vanaf() {
  const w = $('tk-wanneer').value;
  if (w === 'les') return tk.lesStart;
  if (w === 'later') return $('tk-vanaf').value;
  return '';
}

// ---------- Einddatum ----------
// Standaard geen: de leerkracht sluit zelf af, zoals vroeger. Met een einddatum sluit de taak vanzelf, op elke pc.
// Voorstel: de dag van het begin om half vier (of de volgende schooldag als dat al voorbij is).
function totVoorstel(start) {
  const d = new Date(start ? Date.parse(start) : Date.now());
  d.setHours(15, 30, 0, 0);
  while (d.getTime() <= Math.max(Date.now(), start ? Date.parse(start) : 0) || d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
    d.setHours(15, 30, 0, 0);
  }
  return lokaal(d);
}
function totKeuze(kies, label, veld, start) {
  const op = $(kies).value === 'op';
  $(label).classList.toggle('hidden', !op);
  $(veld).min = lokaal(new Date());
  if (op && !$(veld).value) $(veld).value = totVoorstel(start);
}
$('tk-tot-kies').addEventListener('change', () => totKeuze('tk-tot-kies', 'tk-tot-label', 'tk-tot', vanaf()));
function tot() {
  return $('tk-tot-kies').value === 'op' ? $('tk-tot').value : '';
}
const totTekst = v => new Date(v).toLocaleString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

$('brand').addEventListener('click', () => { location.href = '/host'; });
// Terug gaat naar waar je vandaan kwam (De Kronieken, Mijn quizzen…), anders naar het startscherm.
$('to-home').addEventListener('click', () => {
  const van = document.referrer && new URL(document.referrer);
  if (van && van.origin === location.origin && van.pathname !== '/taken' && history.length > 1) history.back();
  else location.href = '/host';
});

// ---------- Wat? ----------

function laadBronnen() {
  socket.emit('tk-bronnen', null, res => {
    if (res.error) return ($('tk-fout').textContent = res.error);
    tk.bronnen = res;
    tk.klas = res.klas;
    tk.gast = new Set(res.gast || []);
    vulBron();
    tekenNamen();
  });
  socket.emit('zorg-get', { dagen: 42 }, res => {
    if (!res || res.error) return;
    tk.zorg = res.zorg;
    tekenSnel();
  });
}

// Een quiz kan de leerling ook alleen in een spel spelen: dan ook de speeltijd per ronde.
function spelKeuze() {
  $('tk-spel-label').classList.toggle('hidden', tk.soort !== 'quiz');
  $('tk-min-label').classList.toggle('hidden', tk.soort !== 'quiz' || !$('tk-spel').value);
}
$('tk-spel').addEventListener('change', spelKeuze);

function vulBron() {
  for (const b of document.querySelectorAll('.tk-soort button')) b.classList.toggle('on', b.dataset.soort === tk.soort);
  $('tk-fb-label').classList.toggle('hidden', tk.soort !== 'oefenblad');
  $('tk-toets-uitleg').classList.toggle('hidden', tk.soort !== 'proef');
  // Voorlezen en punten tonen bij een toets én een oefenblad; een oefenblad blijft altijd in zijn volgorde.
  for (const id of ['tk-vl-label', 'tk-us-label', 'tk-tijd-label']) $(id).classList.toggle('hidden', tk.soort === 'quiz');
  for (const id of ['tk-vv-label', 'tk-bv-label', 'tk-rf-label']) $(id).classList.toggle('hidden', tk.soort !== 'proef');
  $('tk-vv-blad').classList.toggle('hidden', tk.soort !== 'oefenblad');
  spelKeuze();
  const lijst = tk.soort === 'quiz' ? tk.bronnen.quizzen : tk.soort === 'proef' ? tk.bronnen.toetsen || [] : tk.bronnen.bladen;
  const file = vraag.get('file');
  zetBron(file && lijst.find(x => x.file === file));
}

// De gekozen quiz of het gekozen oefenblad staat op de knop; klik erop om een ander te kiezen.
// Met ☑ Meerdere kiezen staan er meer op de knop: elk wordt een aparte taak voor dezelfde leerlingen.
function zetBron(x) {
  if (Array.isArray(x)) {
    if (x.length === 1) x = x[0];
    else return zetMeer(x);
  }
  tk.meer = null;
  $('tk-bron').value = x ? x.file : '';
  const b = $('tk-kies');
  b.innerHTML = '';
  if (x) b.append(el('strong', '', x.title), el('span', 'muted', [x.folder ? `📁 ${x.folder.split('/').join(' › ')}` : '', (x.niveaus || []).length > 1 ? '3 niveaus' : ''].filter(Boolean).join(' · ')), el('span', 'tk-kies-ander', 'Ander kiezen'));
  else b.textContent = tk.soort === 'quiz' ? '📂 Kies een quiz…' : tk.soort === 'proef' ? '📂 Kies een toets…' : '📂 Kies een oefenblad…';
  kiesBron();
}

for (const b of document.querySelectorAll('.tk-soort button')) {
  b.addEventListener('click', () => {
    if (tk.soort === b.dataset.soort) return;
    tk.soort = b.dataset.soort;
    vraag.delete('file');
    vulBron();
    tekenTaken();
  });
}

// Kiezen gaat zoals in Mijn quizzen: mappen links, zoeken in alles. Hier alleen kiezen, niets verplaatsen.
// Pas klaarmaken als je de kiezer voor het eerst opent: zo laadt de pagina Taken sneller (26 nov).
// De lijsten en mappen die de server al stuurde, onthouden we tot dan en geven we daarna mee.
const KIEZER_EV = { quiz: ['quizzes', 'quiz-folders'], oefenblad: ['ob-sheets', 'ob-folders'], proef: ['pf-lijst', 'pf-mappen'] };
const kiezerData = {};
for (const ev of Object.values(KIEZER_EV).flat()) socket.on(ev, d => { kiezerData[ev] = d; });
const gemount = new Set();
function mountKiezer(soort) {
  if (gemount.has(soort)) return;
  gemount.add(soort);
  const voor = Object.fromEntries(KIEZER_EV[soort].map(ev => [ev, [...socket.listeners(ev)]]));
  ItemList.mount($(`k-${soort}`), {
    kind: soort, kiezen: true, errorId: 'k-fout', go: 'Kies ▶',
    play: q => { $('tk-kiezer').close(); zetBron(q); },
    meer: lijst => { $('tk-kiezer').close(); zetBron(lijst); },
  });
  // Eerst de mappen, dan de lijst (zoals de server ze stuurt).
  for (const ev of [KIEZER_EV[soort][1], KIEZER_EV[soort][0]]) {
    if (!(ev in kiezerData)) continue;
    for (const fn of socket.listeners(ev)) if (!voor[ev].includes(fn)) fn(kiezerData[ev]);
  }
}
$('tk-kies').addEventListener('click', () => {
  mountKiezer(tk.soort);
  $('k-titel').textContent = tk.soort === 'quiz' ? 'Kies een quiz' : tk.soort === 'proef' ? 'Kies een toets' : 'Kies een oefenblad';
  for (const soort of ['quiz', 'oefenblad', 'proef']) $(`k-${soort}`).classList.toggle('hidden', tk.soort !== soort);
  $('tk-kiezer').showModal();
  const zoek = $(`k-${tk.soort}`).querySelector('.lib-zoek');
  if (zoek) zoek.focus();
});
$('k-sluit').addEventListener('click', () => $('tk-kiezer').close());

function zetMeer(lijst) {
  tk.meer = lijst;
  $('tk-bron').value = lijst[0].file;
  const b = $('tk-kies');
  b.innerHTML = '';
  const titels = lijst.slice(0, 3).map(x => x.title).join(' · ') + (lijst.length > 3 ? ` · en nog ${lijst.length - 3}` : '');
  b.append(el('strong', '', `${lijst.length} ${tk.soort === 'quiz' ? 'quizzen' : tk.soort === 'proef' ? 'toetsen' : 'oefenbladen'}`), el('span', 'muted', titels), el('span', 'tk-kies-ander', 'Ander kiezen'));
  tk.per = {};
  tk.eigen = tk.vak = null;
  // Elke taak volgt het vak van zijn eigen inhoud: het niveau per naam tonen we dan niet.
  $('tk-niveau').innerHTML = '<option value="">Eigen niveau van elke leerling</option>'
    + ['page', 'schildknaap', 'ridder'].map(n => `<option value="${n}">Iedereen ${Niveau.label(n)}</option>`).join('');
  $('tk-nv-label').classList.remove('hidden');
  meerInfo();
}

function meerInfo() {
  const vast = $('tk-niveau').value;
  $('tk-bron-info').textContent = `${tk.meer.length} aparte taken voor dezelfde leerlingen. `
    + (vast ? `Wie je aantikt, krijgt ${Niveau.NAMES[vast]} waar dat niveau bestaat.` : 'Elke leerling krijgt zijn eigen niveau, zoals in Mijn klas.');
  tekenNamen();
}

// Welk niveau krijgt elke leerling? Dat tonen we bij de namen.
function kiesBron() {
  const file = $('tk-bron').value;
  tk.per = {};
  tk.eigen = tk.vak = null;
  tk.geenEigen = '';
  tk.niet = new Set();
  $('tk-per-info').textContent = '';
  $('tk-al-info').textContent = '';
  $('tk-bron-info').textContent = '';
  $('tk-nv-label').classList.add('hidden');
  $('tk-niveau').innerHTML = '';
  pasStandaardToe();
  if (!file) return tekenNamen();
  socket.emit('tk-voorbeeld', { soort: tk.soort, file }, res => {
    if (res.error) return ($('tk-bron-info').textContent = res.error);
    if ($('tk-bron').value !== file) return;
    tk.eigen = res.niveaus.length > 1 ? res : null;
    tk.vak = res.vak;
    pasStandaardToe();
    tk.niet = new Set(res.niet || []);
    alGegevenInfo(file);
    // Krijgt iemand niet zijn eigen versie (die bestaat niet in deze inhoud)? Duidelijk zeggen, met wat hij wel krijgt.
    const geen = (res.geenEigen || []).filter(x => !tk.niet.has(x.naam));
    tk.geenEigen = geen.length ? `⚠ Geen eigen versie voor: ${geen.slice(0, 6).map(x => `${x.naam} (${Niveau.label(x.eigen)} → ${Niveau.label(x.krijgt)})`).join(', ')}${geen.length > 6 ? ` en nog ${geen.length - 6}` : ''}.` : '';
    // Standaard elk zijn eigen niveau; de leerkracht kan ook iedereen op één niveau zetten.
    $('tk-nv-label').classList.toggle('hidden', !tk.eigen);
    if (tk.eigen) $('tk-niveau').innerHTML = '<option value="">Eigen niveau van elke leerling</option>'
      + res.niveaus.map(n => `<option value="${n}">Iedereen ${Niveau.label(n)}</option>`).join('');
    kiesNiveau();
  });
}

// Al eens gegeven? Dan een waarschuwing (bv. dezelfde toets een tweede keer).
function alGegeven(file) {
  return tk.taken.filter(t => t.soort === tk.soort && t.bron === file);
}
const keren = al => al.slice(0, 3).map(t => `${datum(t.gemaakt)} (${t.leerlingen.length} ${t.leerlingen.length === 1 ? 'leerling' : 'leerlingen'})`).join(', ');
function alGegevenInfo(file) {
  const al = alGegeven(file);
  $('tk-al-info').textContent = !al.length ? ''
    : tk.soort === 'proef' ? `⚠ Deze toets gaf je al: ${keren(al)}.` : `⚠ Dit gaf je al: ${keren(al)}.`;
}

function kiesNiveau() {
  if (tk.meer) return meerInfo();
  const res = tk.eigen, vast = $('tk-niveau').value;
  tk.per = {};
  if (res) for (const naam of Object.keys(res.per)) tk.per[naam] = vast || res.per[naam];
  perInfo();
  $('tk-bron-info').textContent = !res
    ? $('tk-bron').value ? `Eén niveau: iedereen krijgt hetzelfde${tk.vak ? ` (${tk.vak})` : ''}.` : ''
    : vast ? `Iedereen die je aantikt, krijgt ${Niveau.NAMES[vast]} (${Niveau.HELP[vast]}), los van zijn niveau in Mijn klas.`
    : `Op ${res.niveaus.length} niveaus${res.vak ? ` (${res.vak})` : ''}: elke leerling krijgt het niveau dat bij zijn naam staat, zoals in Mijn klas.`;
  if (!vast && tk.geenEigen) $('tk-bron-info').textContent += ` ${tk.geenEigen}`;
  tekenNamen();
}
$('tk-niveau').addEventListener('change', kiesNiveau);

// ---------- Voor wie? ----------

function tekenNamen() {
  const box = $('tk-namen');
  box.innerHTML = '';
  $('tk-geen-klas').classList.toggle('hidden', tk.klas.length > 0);
  // Wie niet (meer) op de klaslijst staat, valt weg uit de keuze.
  for (const n of [...tk.gekozen]) if (!tk.klas.includes(n)) tk.gekozen.delete(n);
  for (const naam of tk.klas) {
    const b = el('button', `tk-naam${tk.gekozen.has(naam) ? ' on' : ''}`);
    b.type = 'button';
    b.append(naam);
    if (tk.markeer && tk.markeer.namen.has(naam)) {
      b.classList.add('markeer', tk.markeer.kleur);
      b.title = waarom(naam);
    }
    if (nietVoorMij(naam)) {
      b.classList.add('niet');
      b.title = tk.gast && tk.gast.has(naam) ? 'Gast: niet in je opvolging' : 'Volgt dit vak niet bij jou';
    }
    const n = tk.per[naam];
    if (n) {
      // Klik op het icoontje: een ander niveau voor deze leerling, of twee niveaus na elkaar.
      const reeks = Array.isArray(n) ? n : [n];
      const ic = el('span', `tk-nv ${reeks[0]}${tk.eigen ? ' wissel' : ''}`, reeks.map(x => Niveau.ICONS[x]).join('→'));
      ic.title = reeks.length > 1 ? `Eerst ${Niveau.NAMES[reeks[0]]}, daarna ${Niveau.NAMES[reeks[1]]}. Klik om te wisselen.`
        : tk.eigen ? `${Niveau.NAMES[reeks[0]]}. Klik om te wisselen.` : Niveau.NAMES[reeks[0]];
      if (tk.eigen) ic.addEventListener('click', e => {
        e.stopPropagation();
        const keuzes = niveauKeuzes();
        const nu = keuzes.findIndex(k => k.join() === reeks.join());
        tk.per[naam] = keuzes[(nu + 1) % keuzes.length];
        if (tk.per[naam].length === 1) tk.per[naam] = tk.per[naam][0];
        tk.gekozen.add(naam);
        tekenNamen();
        perInfo();
      });
      b.appendChild(ic);
    }
    b.addEventListener('click', () => {
      if (tk.gekozen.has(naam)) tk.gekozen.delete(naam); else tk.gekozen.add(naam);
      b.classList.toggle('on', tk.gekozen.has(naam));
      knop();
    });
    box.appendChild(b);
  }
  tekenPerLijst();
  knop();
}

// Het niveau per leerling in een gewoon keuzelijstje (naast het icoontje bij de naam): iedereen ziet het meteen.
const keuzeTekst = k => k.map(x => Niveau.label(x)).join(' → ');
function tekenPerLijst() {
  const d = $('tk-per-lijst');
  const aan = !!(tk.eigen && !tk.meer && !$('tk-niveau').value);
  d.classList.toggle('hidden', !aan);
  if (!aan) return;
  const raster = $('tk-per-raster');
  raster.innerHTML = '';
  const keuzes = niveauKeuzes();
  for (const naam of tk.klas) {
    const v = tk.per[naam];
    if (!v) continue;
    const reeks = Array.isArray(v) ? v : [v];
    const rij = el('label', `tk-per-rij${tk.gekozen.has(naam) ? ' on' : ''}`);
    const sel = el('select');
    sel.innerHTML = keuzes.map((k, i) => `<option value="${i}"${k.join() === reeks.join() ? ' selected' : ''}>${keuzeTekst(k)}</option>`).join('');
    sel.addEventListener('change', () => {
      const k = keuzes[Number(sel.value)];
      tk.per[naam] = k.length === 1 ? k[0] : k;
      tk.gekozen.add(naam);
      tekenNamen();
      perInfo();
    });
    rij.append(el('span', '', naam), sel);
    raster.appendChild(rij);
  }
}

function knop() {
  const n = tk.gekozen.size;
  $('tk-geef').disabled = !n || !$('tk-bron').value;
  $('tk-bekijk').disabled = !$('tk-bron').value;
  const m = tk.meer && tk.meer.length;
  const wie = n === 1 ? 'leerling' : 'leerlingen';
  $('tk-geef').textContent = !n ? 'Tik eerst leerlingen aan'
    : m ? (n === tk.klas.length && n > 1 ? `Geef ${m} taken aan de hele klas` : `Geef ${m} taken aan ${n} ${wie}`)
    : n === tk.klas.length && n > 1 ? 'Geef taak aan de hele klas' : `Geef taak aan ${n} ${wie}`;
}

// De niveaus die je per leerling kan kiezen: elk niveau apart, en twee opeenvolgende na elkaar (bv. Page → Schildknaap).
function niveauKeuzes() {
  const n = tk.eigen ? tk.eigen.niveaus : [];
  return [...n.map(x => [x]), ...n.slice(1).map((x, i) => [n[i], x])];
}
// Zie je meteen hoeveel leerlingen twee niveaus na elkaar krijgen.
function perInfo() {
  const twee = Object.entries(tk.per).filter(([naam, v]) => Array.isArray(v) && tk.gekozen.has(naam)).length;
  $('tk-per-info').textContent = !tk.eigen ? '' : twee
    ? twee === 1 ? '1 leerling krijgt twee niveaus na elkaar: de tweede taak verschijnt als de eerste af is.' : `${twee} leerlingen krijgen twee niveaus na elkaar: de tweede taak verschijnt als de eerste af is.`
    : 'Een ander niveau voor één leerling? Kies het bij 🎚 Niveau per leerling hieronder, of klik op het icoontje bij de naam.';
}

// Wie niet meedoet (gast, of volgt dit vak niet bij mij): niet aanvinken bij Hele klas. Aantikken kan wel.
function nietVoorMij(naam) {
  return !!((tk.gast && tk.gast.has(naam)) || (tk.niet && tk.niet.has(naam)));
}

function kiesNamen(namen, erbij = false) {
  if (!erbij) tk.gekozen.clear();
  for (const n of namen) if (tk.klas.includes(n)) tk.gekozen.add(n);
  tekenNamen();
}

// Wat "Aandacht nodig" en "Even opletten" betekenen (verbeterpunten 20 nov, 6): dezelfde kleuren als in Zorg.
const UITLEG_SNEL = {
  rood: 'Uit Zorg: de laatste tijd minder dan de helft juist, of ver onder de klas.',
  oranje: 'Uit Zorg: wat onder de klas, gaat achteruit, gokt of heeft meerdere doelen nog niet beheerst.',
};
// Waarom deze leerling erbij zit (de signalen uit Zorg), voor bij de naam.
function waarom(naam) {
  const l = tk.zorg && tk.zorg.leerlingen.find(x => x.naam === naam);
  return l ? (l.signalen || []).filter(x => x.niveau === 'rood' || x.niveau === 'oranje').map(x => x.tekst).join(' · ') : '';
}
// Snel kiezen uit het zorgoverzicht: de kleuren en de groepjes per doel.
function tekenSnel() {
  const z = tk.zorg;
  if (!z) return;
  const kleur = k => z.leerlingen.filter(l => l.opLijst && l.kleur === k).map(l => l.naam);
  for (const k of ['rood', 'oranje']) {
    const b = document.querySelector(`[data-snel="${k}"]`);
    const n = kleur(k).length;
    b.classList.toggle('hidden', !n);
    b.textContent = k === 'rood' ? `🔴 Aandacht nodig (${n})` : `🟠 Even opletten (${n})`;
    b.title = UITLEG_SNEL[k];
  }
  const sel = $('tk-groepje');
  const groepen = [...z.klassikaal, ...z.groepjes].filter(d => d.niet.length);
  sel.classList.toggle('hidden', !groepen.length);
  for (const d of groepen) {
    const tekst = `${d.code} ${d.tekst}`.slice(0, 70);
    const o = new Option(`${tekst} (${d.niet.length})`, d.niet.join('|'));
    o.title = d.niet.join(', ');
    sel.appendChild(o);
  }
}

document.querySelector('#tk-snel').addEventListener('click', e => {
  const b = e.target.closest('[data-snel]');
  if (!b) return;
  const w = b.dataset.snel;
  $('tk-snel-info').textContent = '';
  tk.markeer = null;
  if (w === 'alle') {
    const weg = tk.klas.filter(nietVoorMij);
    kiesNamen(tk.klas.filter(n => !nietVoorMij(n)));
    if (weg.length) $('tk-snel-info').textContent = weg.length === 1
      ? `1 leerling volgt dit vak niet bij jou (${weg[0]}). Tik de naam aan om toch toe te voegen.`
      : `${weg.length} leerlingen volgen dit vak niet bij jou (${weg.join(', ')}). Tik een naam aan om toch toe te voegen.`;
  } else if (w === 'geen') kiesNamen([]);
  else {
    // Aanvinken én markeren, met wat het betekent: zo zie je wie en waarom.
    const namen = tk.zorg.leerlingen.filter(l => l.opLijst && l.kleur === w).map(l => l.naam);
    tk.markeer = { kleur: w, namen: new Set(namen) };
    kiesNamen(namen);
    const wie = namen.join(', ');
    $('tk-snel-info').textContent = w === 'rood'
      ? `🔴 Uit Zorg: de laatste tijd minder dan de helft juist, of ver onder de klas. Aangevinkt: ${wie}. Wijs een naam aan om te zien waarom.`
      : `🟠 Uit Zorg: wat onder de klas, gaat achteruit, gokt of heeft meerdere doelen nog niet beheerst. Aangevinkt: ${wie}. Wijs een naam aan om te zien waarom.`;
  }
});
$('tk-groepje').addEventListener('change', () => {
  const v = $('tk-groepje').value;
  tk.markeer = null;
  if (v) kiesNamen(v.split('|'));
  $('tk-groepje').value = '';
});

$('tk-geef').addEventListener('click', async () => {
  const namen = [...tk.gekozen];
  const b = $('tk-geef');
  const start = vanaf();
  if ($('tk-wanneer').value === 'later' && !(Date.parse(start) > Date.now())) {
    $('tk-fout').textContent = 'Kies een dag en uur in de toekomst.';
    return;
  }
  const einde = tot();
  if ($('tk-tot-kies').value === 'op' && !(Date.parse(einde) > Math.max(Date.now(), start ? Date.parse(start) : 0))) {
    $('tk-fout').textContent = start ? 'Kies een einddatum na het begin van de taak.' : 'Kies een einddatum in de toekomst.';
    return;
  }
  const tijd = tk.soort === 'quiz' ? undefined : Number($('tk-tijd').value) || undefined;
  const pogingen = Number($('tk-pogingen').value) || undefined;
  // Dezelfde toets al gegeven aan (een deel van) deze leerlingen? Eerst vragen.
  if (!tk.meer && tk.soort === 'proef') {
    const al = new Set();
    for (const t of alGegeven($('tk-bron').value)) for (const l of t.leerlingen) if (namen.includes(l.naam)) al.add(l.naam);
    const wie = [...al].slice(0, 5).join(', ') + (al.size > 5 ? ` en nog ${al.size - 5}` : '');
    // Staat de oude taak nog open voor hen, dan sluit die (Instellingen › Taken): dat zeggen we erbij.
    const sluit = (!tk.std || tk.std.oudeSluiten !== false) && alGegeven($('tk-bron').value).some(t => !t.dicht && t.leerlingen.some(l => namen.includes(l.naam) && l.status !== 'klaar'));
    const vraagTekst = sluit
      ? (al.size === 1 ? `${wie} kreeg deze toets al. Toch nog eens geven? De oude taak sluit dan, de punten blijven.` : `${wie} kregen deze toets al. Toch nog eens geven? De oude taak sluit dan, de punten blijven.`)
      : (al.size === 1 ? `${wie} kreeg deze toets al. Toch nog eens geven?` : `${wie} kregen deze toets al. Toch nog eens geven?`);
    if (al.size && !await Ui.vraag(vraagTekst, { ja: 'Toch geven', nee: 'Nee' })) return;
  }
  b.disabled = true;
  // Twee niveaus na elkaar: eerst de taak met het eerste niveau, dan per tweede niveau een taak die daarna verschijnt.
  const per = {}, daarna = {};
  if (tk.eigen && !tk.meer) for (const naam of namen) {
    const v = tk.per[naam];
    if (!v) continue;
    per[naam] = Array.isArray(v) ? v[0] : v;
    if (Array.isArray(v)) (daarna[v[1]] = daarna[v[1]] || []).push(naam);
  }
  // Meerdere gekozen: één taak per quiz of oefenblad, na elkaar.
  const files = tk.meer ? tk.meer.map(x => x.file) : [$('tk-bron').value];
  const fouten = [];
  let klaar = 0;
  const volgende = () => {
    if (klaar + fouten.length === files.length) return gedaan();
    const file = files[klaar + fouten.length];
    socket.emit('tk-maak', { soort: tk.soort, file, namen, per: Object.keys(per).length ? per : undefined, feedback: $('tk-feedback').value, spel: $('tk-spel').value, minuten: Number($('tk-minuten').value), niveau: $('tk-niveau').value, les: tk.les && { week: tk.les.week, slot: tk.les.slot }, vanaf: start, voorlees: $('tk-voorlees').value, vragenVast: $('tk-volgorde').value !== 'schud', keuzesVast: $('tk-volgorde').value === 'alles', uitslag: $('tk-uitslag').checked, beveiligd: $('tk-beveiligd').checked, reflectie: $('tk-reflectie').checked, tot: einde || undefined, tijd, pogingen, herkansing: tk.soort === 'proef' && files.length === 1 ? tk.herkansing || undefined : undefined }, res => {
      if (res.error) fouten.push(res.error); else klaar++;
      // Eén herkansing: de volgende taak die je hier geeft, is weer een gewone.
      if (!res.error && tk.herkansing) { tk.herkansing = null; const i = document.querySelector('.tk-herk-info'); if (i) i.remove(); }
      if (res.error || !Object.keys(daarna).length) return volgende();
      // De tweede niveaus: elk een taak die pas verschijnt als de eerste af is.
      const rest = Object.entries(daarna);
      const nog = () => {
        if (!rest.length) return volgende();
        const [niveau, wie] = rest.shift();
        socket.emit('tk-maak', { soort: tk.soort, file, namen: wie, niveau, na: res.id, feedback: $('tk-feedback').value, spel: $('tk-spel').value, minuten: Number($('tk-minuten').value), vanaf: start, voorlees: $('tk-voorlees').value, vragenVast: $('tk-volgorde').value !== 'schud', keuzesVast: $('tk-volgorde').value === 'alles', uitslag: $('tk-uitslag').checked, beveiligd: $('tk-beveiligd').checked, reflectie: $('tk-reflectie').checked, tot: einde || undefined, tijd, pogingen }, r2 => {
          if (r2.error) fouten.push(r2.error);
          nog();
        });
      };
      nog();
    });
  };
  const gedaan = () => {
    knop();
    $('tk-fout').textContent = [...new Set(fouten)].join(' ');
    if (!klaar) return;
    // Volgende taak weer standaard op ieders eigen niveau, en met je standaardkeuzes.
    tk.zelf.clear();
    pasStandaardToe();
    $('tk-niveau').value = '';
    kiesNiveau();
    kiesNamen([]);
    const wie = namen.length === 1 ? namen[0] : `${namen.length} leerlingen`;
    $('tk-wanneer').value = tk.lesStart ? 'les' : 'nu';
    wanneer();
    // Einddatum en tijdslimiet: de volgende taak weer zonder (bewust kiezen, per taak).
    $('tk-tot-kies').value = '';
    $('tk-tot').value = '';
    totKeuze('tk-tot-kies', 'tk-tot-label', 'tk-tot');
    $('tk-tijd').value = '';
    $('tk-pogingen').value = '';
    if (start) return Ui.melding(klaar === 1 ? `De taak is gepland voor ${wie}. Ze verschijnt ${wanneerTekst(start)} bij Mijn taken.` : `${klaar} taken zijn gepland voor ${wie}. Ze verschijnen ${wanneerTekst(start)} bij Mijn taken.`);
    Ui.melding(klaar === 1 ? `De taak staat klaar bij ${wie}. Zij vinden ze op hun toestel bij Mijn taken.` : `${klaar} taken staan klaar bij ${wie}. Zij vinden ze op hun toestel bij Mijn taken.`);
  };
  volgende();
});

// ---------- Gegeven taken ----------

const STATUS = { nieuw: 'Nog niet begonnen', bezig: 'Bezig', klaar: 'Klaar' };
// Wie niet meedoet (volgt dit vak niet bij mij, of gast) en wie afwezig was, telt niet mee bij "nog niet".
const telt = l => !l.niet && !l.afwezig && !l.wacht;
const UUR = new Intl.DateTimeFormat('nl-BE', { hour: '2-digit', minute: '2-digit' });
const uur = iso => UUR.format(new Date(iso));
// Twee taken met dezelfde naam: wat is het verschil? Niveaus, dag en uur, aantal leerlingen, na een andere taak.
function verschil(t) {
  const zelfde = tk.taken.filter(x => x !== t && x.titel === t.titel && x.soort === t.soort);
  if (!zelfde.length) return '';
  const kenmerk = x => ({
    niveau: x.niveaus.length > 1 ? [...new Set(x.leerlingen.map(l => l.niveau))].map(n => Niveau.ICONS[n]).join('') : '',
    na: x.na ? `na ${(x.na.niveaus || []).map(n => Niveau.ICONS[n]).join('')} ${x.na.titel || ''}`.trim() : '',
    n: `${x.leerlingen.length} ${x.leerlingen.length === 1 ? 'leerling' : 'leerlingen'}`,
    dag: `${datum(x.gemaakt)} ${uur(x.gemaakt)}`,
    bron: x.bron || '',
  });
  const mij = kenmerk(t), rest = zelfde.map(kenmerk);
  const delen = ['niveau', 'n', 'dag'].filter(k => mij[k] && rest.some(o => o[k] !== mij[k])).map(k => mij[k]);
  if (rest.some(o => o.bron !== mij.bron)) delen.push('ander bestand');
  return delen.length ? `Zelfde naam als een andere taak. Deze: ${delen.join(' · ')}` : '';
}

function tekenTaken() {
  const box = $('tk-taken');
  const alle = tk.taken.filter(t => !t.dicht);
  // Standaard Alles, of het tabje dat de leerkracht het laatst koos (verbeterpunten 20 nov, 5).
  if (tk.tab === undefined) { try { tk.tab = localStorage.getItem(TK_TAB) || ''; } catch { tk.tab = ''; } }
  for (const b of $('tk-tabjes').querySelectorAll('button')) b.classList.toggle('on', b.dataset.tab === tk.tab);
  // Alleen de soort van het tabje: Oefenbladen toont de gegeven oefenbladen, Toetsen de gegeven toetsen.
  const lijst = tk.taken.filter(t => !tk.tab || t.soort === tk.tab);
  $('tk-gegeven-kop').textContent = 'Gegeven taken';
  $('tk-geen').classList.toggle('hidden', lijst.length > 0);
  $('tk-geen').textContent = tk.tab === 'quiz' ? 'Nog geen quizzen gegeven.' : tk.tab === 'proef' ? 'Nog geen toetsen gegeven.' : tk.tab === 'oefenblad' ? 'Nog geen oefenbladen gegeven.' : 'Nog geen taken gegeven.';
  box.innerHTML = '';
  // Kaarten waar niets aan veranderde, blijven staan: de lijst komt twee keer per seconde binnen als de klas werkt.
  const vorige = tk.kaarten || new Map();
  tk.kaarten = new Map();
  // Bovenaan: wie nu bezig is, over alle taken heen (ook op je andere pc's). Klik: die leerling.
  const nu = [];
  for (const t of alle) for (const l of t.leerlingen) if (l.status === 'bezig') nu.push({ t, l });
  const top = $('tk-nu-top');
  top.innerHTML = '';
  if (nu.length) {
    const p = el('div', 'panel tk-nu');
    p.append(el('strong', '', `✏️ Nu bezig (${nu.length})`));
    const rij = el('div', 'tk-nu-rij');
    for (const { t, l } of nu) {
      // Hoe ver de leerling is, als "7 van 10 gedaan" met een balkje: "7/10" lijkt op een punt.
      const b = el('button', 'tk-nu-ll', `${l.naam} · ${t.titel} · `);
      b.append(el('span', '', `${l.gedaan} van ${l.totaal} gedaan`));
      const balk = el('span', 'tk-ll-balk tk-nu-balk');
      balk.appendChild(el('i')).style.width = `${l.totaal ? (l.gedaan / l.totaal) * 100 : 0}%`;
      b.append(balk);
      b.type = 'button';
      if (l.elders) b.title = `Werkt op ${l.elders}`;
      b.addEventListener('click', () => toonDetail(t.id, l.naam));
      rij.appendChild(b);
    }
    p.appendChild(rij);
    // De toetsen die lopen: één klik naar het overzicht (punten, verbeteren).
    for (const t of alle.filter(x => x.soort === 'proef' && x.afname && x.leerlingen.some(l => l.status === 'bezig'))) {
      const k = t.leerlingen.filter(l => l.status === 'klaar').length, b = t.leerlingen.filter(l => l.status === 'bezig').length;
      const g = el('a', 'tk-nu-toets', `📝 ${t.titel}: ${k} klaar, ${b} bezig · Verbeteren ▶`);
      g.href = `/proef?verbeter=${encodeURIComponent(t.afname)}`;
      p.appendChild(g);
    }
    top.appendChild(p);
  }
  // In groepen, volgens de dag voor de leerlingen: Vandaag, Deze week, Gepland later, Afgelopen (nog open), Afgesloten.
  const per = {};
  for (const t of lijst) (per[groepVan(t)] = per[groepVan(t)] || []).push(t);
  let dicht = {};
  try { dicht = JSON.parse(localStorage.getItem(TK_GROEPEN) || '{}'); } catch {}
  for (const [id, naam] of GROEPEN) {
    const taken = per[id];
    if (!taken) continue;
    taken.sort((a, b) => (id === 'later' ? 1 : -1) * String(a.dag).localeCompare(String(b.dag)));
    const g = el('details', `tk-groep tk-groep-${id}`);
    g.open = dicht[id] === undefined ? id !== 'dicht' : !dicht[id];
    g.append(el('summary', '', `${naam} (${taken.length})`));
    g.addEventListener('toggle', () => {
      try { const d = JSON.parse(localStorage.getItem(TK_GROEPEN) || '{}'); d[id] = !g.open; localStorage.setItem(TK_GROEPEN, JSON.stringify(d)); } catch {}
    });
    // Afgesloten: de kaarten pas tekenen als je de groep openklikt (snel, ook met veel oude taken).
    const vul = () => { if (!g.dataset.vol) { g.dataset.vol = '1'; for (const t of taken) g.appendChild(kaartVan(t, vorige)); } };
    if (g.open) vul(); else g.addEventListener('toggle', vul, { once: true });
    box.appendChild(g);
  }
}

// Eén kaart: dezelfde als vorige keer als er aan de taak niets veranderde (sneller, 26 nov), anders opnieuw.
function kaartVan(t, vorige) {
  const sig = JSON.stringify(t) + JSON.stringify(verschil(t));
  const oud = vorige.get(t.id);
  const k = oud && oud.sig === sig ? oud.el : kaart(t);
  tk.kaarten.set(t.id, { sig, el: k });
  return k;
}

const TK_GROEPEN = 'lancelot-tk-groepen';
const GROEPEN = [['vandaag', 'Vandaag'], ['week', 'Deze week'], ['later', 'Gepland later'], ['open', 'Afgelopen (nog open)'], ['dicht', 'Afgesloten']];
function groepVan(t) {
  if (t.dicht) return 'dicht';
  if (t.vanaf) return 'later';
  const dag = new Date(t.dag), nu = new Date();
  if (dag.toDateString() === nu.toDateString()) return 'vandaag';
  const maandag = new Date(nu);
  maandag.setHours(0, 0, 0, 0);
  maandag.setDate(maandag.getDate() - ((maandag.getDay() + 6) % 7));
  return dag >= maandag ? 'week' : 'open';
}
// Een kaart is compact: één regel met de tellers; de namen klappen open met ▾ (één plek per vraag, 3).
// Wie je openklapte, blijft open (onthouden op deze pc).
const TK_OPEN = 'lancelot-tk-open';
function opengeklapt() {
  try { return new Set(JSON.parse(localStorage.getItem(TK_OPEN) || '[]')); } catch { return new Set(); }
}

function kaart(t) {
  const k = el('div', `panel tk-taak${t.dicht ? ' dicht' : ''}${opengeklapt().has(t.id) ? '' : ' ingeklapt'}`);
  const kop = el('div', 'tk-taak-kop');
  // Dichtklappen: alleen de kop blijft staan (onthouden op deze pc).
  const klap = el('button', 'tk-klap', '▾');
  klap.type = 'button';
  klap.title = 'De namen tonen of verbergen';
  klap.setAttribute('aria-label', 'De namen tonen of verbergen');
  const wissel = () => {
    const set = opengeklapt();
    if (k.classList.toggle('ingeklapt')) set.delete(t.id); else { set.add(t.id); vulNamen(); }
    try { localStorage.setItem(TK_OPEN, JSON.stringify([...set].slice(-300))); } catch {}
  };
  klap.addEventListener('click', wissel);
  const img = el('img');
  img.src = `/img/icons/${t.spel ? t.spel.icoon : t.soort === 'quiz' ? 'toernooi' : t.soort === 'proef' ? 'proef' : 'oefenblad'}.webp`;
  img.alt = '';
  const tel = s => t.leerlingen.filter(l => l.status === s && (s !== 'nieuw' || telt(l))).length;
  const inhalen = t.leerlingen.filter(l => l.afwezig).length;
  const titel = el('div', 'tk-taak-titel');
  titel.append(el('strong', '', t.titel));
  if (t.vanaf) titel.append(el('small', 'tk-taak-gepland', `⏰ Gepland: verschijnt ${wanneerTekst(t.vanaf)}`));
  titel.append(el('small', 'muted', `${t.soort === 'quiz' ? 'Quiz' : t.soort === 'proef' ? 'Toets' : 'Oefenblad'}${t.spel ? ` in ${t.spel.naam}` : ''}${t.vak ? ` · ${t.vak}` : ''}${t.niveau && !t.na ? ` · iedereen ${Niveau.NAMES[t.niveau]}` : ''}${t.uitLesmap ? ' · uit je lesmap' : ''} · ${datum(t.gemaakt)}${t.dicht ? ' · afgesloten' : ''}`));
  // Uit een les in De Zonnewijzer: het doel van die les.
  if (t.les) titel.append(el('small', 'tk-taak-les', `🎯 ${t.les.doel || t.les.titel}`));
  if (t.na) titel.append(el('small', 'tk-taak-na', `⏭ Verschijnt per leerling als ${t.na.weg ? 'de vorige taak' : `"${t.na.titel}" (${(t.na.niveaus || []).map(n => Niveau.NAMES[n]).join(', ')})`} af is`));
  if (t.soort === 'proef' && t.beveiligd) titel.append(el('small', 'tk-taak-bv', '🛡 Volledig scherm: je ziet wie de toets verlaat'));
  // Einddatum en tijdslimiet (wens 25 nov).
  if (t.tot && !t.dicht) titel.append(el('small', 'tk-taak-tot', `⏳ Sluit vanzelf: ${totTekst(t.tot)}`));
  if (t.dicht && t.vanzelfDicht) titel.append(el('small', 'tk-taak-tot', '⏳ Vanzelf gesloten op de einddatum'));
  if (t.tijd) titel.append(el('small', 'tk-taak-tijd', `⏱ ${t.tijd} minuten per leerling`));
  if (t.pogingen > 1) titel.append(el('small', 'tk-taak-tijd', `↻ ${t.pogingen} pogingen: de leerling mag zelf opnieuw`));
  const vs = verschil(t);
  if (vs) titel.append(el('small', 'tk-taak-verschil', `≠ ${vs}`));
  // Op een andere pc anders (wens 24 nov, punt 4): daar nog open, of daar (nog) niet open. Verdwijnt na de sync.
  const ts = t.toestellen || {};
  if (ts.nogOpen) titel.append(el('small', 'tk-taak-toestel', `💻 Nog open op ${ts.nogOpen.join(', ')}`));
  if (ts.nietOpen) titel.append(el('small', 'tk-taak-toestel', `💻 Niet open op ${ts.nietOpen.join(', ')}`));
  const telling = el('div', 'tk-telling');
  telling.append(el('span', 'klaar', `${tel('klaar')} klaar`), el('span', 'bezig', `${tel('bezig')} bezig`), el('span', 'nieuw', `${tel('nieuw')} nog niet`));
  if (inhalen) telling.append(el('span', 'inhalen', `${inhalen} inhalen`));
  // Klik op de tellers: de namen open of dicht. Wie deed wat over alle taken heen: Opvolgen.
  telling.title = 'De namen tonen of verbergen';
  telling.addEventListener('click', wissel);
  const opv = el('a', 'tk-opvolgen', 'Opvolgen ▶');
  opv.href = '/opvolgen';
  opv.addEventListener('click', e => e.stopPropagation());
  telling.append(opv);
  const acties = el('div', 'actions');
  const knopje = (tekst, fn, cls = 'secondary') => {
    const b = el('button', `${cls} tk-mini`, tekst);
    b.addEventListener('click', fn);
    acties.appendChild(b);
  };
  // Een toets: één klik naar het overzicht in De Proef (punten, verbeteren, Klaar met verbeteren, gemaild).
  if (t.soort === 'proef' && t.afname) knopje('Verbeteren ▶', () => { location.href = `/proef?verbeter=${encodeURIComponent(t.afname)}`; }, 'gold');
  // Remediëring (wens 25 nov, punt 4): per leerling een oefenblad met wat fout liep.
  // Live overzicht (wens 25 nov, punt 8; sinds 26 nov ook oefenbladen en quizzen): wie bezig is, waar, wie lang vastzit, wie klaar is.
  if (!t.dicht && !t.vanaf) knopje('📡 Live', () => live(t.id));
  if (t.soort === 'proef' && t.afname) knopje('🩹 Remediëring', () => remediering(t));
  if (t.vanaf) knopje('▶ Nu al geven', () => socket.emit('tk-start', { id: t.id }, uit));
  if (!t.dicht) knopje('+ Leerlingen', () => erbij(t));
  // Beveiligd aan of uit, ook voor een toets die al loopt: wie werkt, krijgt het meteen.
  if (t.soort === 'proef' && !t.dicht) knopje(t.beveiligd ? '🛡 Volledig scherm: aan' : '🛡 Volledig scherm: uit', () => socket.emit('tk-beveiligd', { id: t.id, aan: !t.beveiligd }, uit), t.beveiligd ? 'secondary on' : 'secondary');
  // De keuzes achteraf veranderen, ook als de taak al loopt of afgesloten is (bv. de punten alsnog tonen).
  knopje('⚙️ Instellingen', () => keuzes(t));
  knopje('👁 Bekijk', () => bekijk({ id: t.id }, t));
  if (t.dicht) knopje('🔓 Weer openen', () => socket.emit('tk-heropen', { id: t.id }, uit));
  else knopje('🔒 Afsluiten', async () => {
    if (await Ui.vraag('Deze taak afsluiten? Wie bezig is, levert in zoals het er nu staat. Wie nog niet begon, telt niet mee.', { ja: 'Afsluiten', nee: 'Nee' })) socket.emit('tk-sluit', { id: t.id }, uit);
  });
  knopje('🗑', async () => {
    if (await Ui.vraag(`De taak "${t.titel}" wissen? Wat leerlingen al deden, blijft in het logboek.`, { ja: 'Wissen', nee: 'Nee' })) socket.emit('tk-wis', { id: t.id }, uit);
  });
  kop.append(klap, img, titel, telling, acties);

  const rij = el('div', 'tk-leerlingen');
  // De namen pas tekenen als de kaart open staat (sneller laden, 26 nov): dichtgeklapt zie je alleen de tellers.
  const vulNamen = () => {
    if (rij.dataset.vol) return;
    rij.dataset.vol = '1';
    for (const l of t.leerlingen) {
      const b = el('button', `tk-ll ${l.status}${l.niet ? ' niet' : ''}${l.afwezig ? ' inhalen' : ''}${l.wacht ? ' wacht' : ''}`);
      b.type = 'button';
      const naam = el('span', 'tk-ll-naam', l.naam);
      if (l.afwezig) naam.append(el('span', 'tk-ll-inhalen', ' 🏠'));
      // Geen goede voorleesstem op het toestel van deze leerling (melding van voorlees.js).
      const stemIcoon = StemStand.el(l.naam);
      if (stemIcoon) naam.append(stemIcoon);
      // Werkt op een andere pc (via Mijn lesmap): op welke.
      if (l.elders) naam.append(el('span', 'tk-ll-pc', ` 💻 ${l.elders}`));
      if (t.niveaus.length > 1) naam.prepend(el('span', `tk-nv ${l.niveau}`, Niveau.ICONS[l.niveau]));
      // Een toets: 🔊 als de computer voorleest, en na het inleveren de punten die de computer gaf (+ ? = jij verbetert nog).
      if (t.soort === 'proef' && l.voorlees) naam.append(el('span', 'tk-ll-vl', ' 🔊'));
      // Verliet de beveiligde toets: hoe vaak (de details staan bij de leerling en bij de resultaten).
      if (l.weg) naam.append(el('span', 'tk-ll-weg', ` ⚠ ${l.weg}×`));
      // Tijdslimiet: een eigen tijd (anders dan de taak), en wie inleverde omdat de tijd om was.
      if (l.tijd && l.tijd !== t.tijd) naam.append(el('span', 'tk-ll-tijd', ` ⏱${l.tijd}′`));
      if (l.tijdOp) naam.append(el('span', 'tk-ll-tijd', ' ⏱ om'));
      if (l.poging > 1) naam.append(el('span', 'tk-ll-tijd', ` ↻${l.poging}`));
      // Reflectie na de toets (wens 25 nov, punt 10): hoe zeker hij was.
      if (l.reflectie && l.reflectie.zeker) naam.append(el('span', 'tk-ll-refl', ` ${reflSmiley(l.reflectie.zeker)}`));
      const toetsPunten = t.soort === 'proef' && l.autoMax ? `${PfPaper.nl(l.punten)}/${PfPaper.nl(l.autoMax)}${l.hand ? ' + ?' : ''}` : '';
      const stand = l.status === 'klaar'
        ? (toetsPunten || (l.score ? `${l.juist}/${l.score}` : '✔'))
        : l.status === 'bezig' ? `${l.gedaan} van ${l.totaal}` : l.afwezig ? 'inhalen' : l.wacht ? '⏭ wacht' : '–';
      const pct = l.status === 'klaar' && t.soort === 'proef' && l.autoMax ? l.punten / l.autoMax : l.status === 'klaar' && l.score ? l.juist / l.score : null;
      const s = el('span', `tk-ll-stand${pct === null ? '' : pct >= .8 ? ' hoog' : pct < .5 ? ' laag' : ''}`, stand);
      const balk = el('span', 'tk-ll-balk');
      balk.appendChild(el('i')).style.width = `${l.status === 'klaar' ? 100 : l.totaal ? (l.gedaan / l.totaal) * 100 : 0}%`;
      b.title = l.afwezig ? 'Afwezig: haalt deze taak later in' : l.wacht ? 'Verschijnt als de vorige taak af is' : l.niet ? 'Volgt dit vak niet bij jou (telt niet mee)' : t.soort === 'proef' && l.status === 'bezig' && l.autoMax ? `${STATUS[l.status]} · vraag ${l.pos + 1} · al ${PfPaper.nl(l.punten)} van ${PfPaper.nl(l.autoMax)} punten` : STATUS[l.status];
      if (l.weg) b.title += ` · verliet de toets ${l.weg}×`;
      if (l.rest !== undefined) b.title += ` · nog ${Math.ceil(l.rest / 60000)} min`;
      if (l.tijdOp) b.title += ' · leverde in: de tijd was om';
      b.append(naam, s, balk);
      b.addEventListener('click', () => toonDetail(t.id, l.naam));
      rij.appendChild(b);
    }
  };
  if (!k.classList.contains('ingeklapt')) vulNamen();
  k.append(kop, rij);
  return k;
}

const WEG_SOORT = { tab: 'ander tabblad of venster', scherm: 'volledig scherm verlaten', herladen: 'toets opnieuw geopend' };
// Een leerling verliet een beveiligde toets: een melding bovenaan, ze verdwijnt vanzelf.
socket.on('tk-alarm', a => {
  if (!a || !a.naam) return;
  let n = $('tk-alarm');
  if (!n) {
    n = el('div', 'tk-alarm');
    n.id = 'tk-alarm';
    n.setAttribute('role', 'status');
    document.body.appendChild(n);
  }
  n.textContent = `⚠ ${a.naam} verliet de toets "${a.titel}" (${WEG_SOORT[a.soort] || a.soort})`;
  n.classList.add('aan');
  clearTimeout(n.timer);
  n.timer = setTimeout(() => n.classList.remove('aan'), 8000);
});

function uit(res) {
  if (res && res.error) Ui.melding(res.error);
}

// Tabjes Alles / Oefenbladen / Quizzen / Toetsen: volgen de soort die je bovenaan kiest, of kies zelf.
for (const b of $('tk-tabjes').querySelectorAll('button')) b.addEventListener('click', () => { tk.tab = b.dataset.tab; try { localStorage.setItem(TK_TAB, tk.tab); } catch {} tekenTaken(); });
// Oude taken opruimen: afsluiten (ze blijven bij Afgesloten).
$('tk-opruimen').addEventListener('click', async () => {
  const grens = Date.now() - 7 * 864e5;
  const oud = tk.taken.filter(t => !t.dicht && !t.vanaf && Date.parse(t.dag) < grens);
  const bezig = oud.filter(t => t.leerlingen.some(l => l.status === 'bezig')).length;
  const n = oud.length - bezig;
  if (!n) return Ui.melding(bezig ? 'Er zijn geen oude taken om op te ruimen: aan de open taken van vorige week werkt nog iemand.' : 'Er zijn geen open taken van meer dan een week geleden.');
  if (!await Ui.vraag(`${n === 1 ? '1 taak' : `${n} taken`} van meer dan een week geleden afsluiten? Ze blijven bij Afgesloten, met alles wat de leerlingen deden.${bezig ? ` ${bezig === 1 ? '1 taak blijft open: daar werkt nog iemand aan.' : `${bezig} taken blijven open: daar werkt nog iemand aan.`}` : ''}`, { ja: 'Opruimen', nee: 'Nee' })) return;
  socket.emit('tk-opruimen', { dagen: 7 }, res => {
    if (res && res.error) return Ui.melding(res.error);
  });
});
StemStand.start(socket);
StemStand.op(() => { tk.kaarten = null; if (tk.taken.length) tekenTaken(); });

socket.on('tk-lijst', lijst => {
  tk.taken = lijst;
  tekenTaken();
  if (tk.live && $('tk-live').open) tekenLive();
  // Staat een leerling open, dan alleen opnieuw tekenen als bij hem iets veranderde.
  const d = tk.detail;
  if (!d || !$('tk-detail').open) return;
  const t = lijst.find(x => x.id === d.id);
  const l = t && t.leerlingen.find(x => x.naam === d.naam);
  if (!l || l.status !== d.status || l.gedaan !== d.gedaan || l.juist !== d.juist || l.niveau !== d.niveau || l.punten !== d.puntenNu) toonDetail(d.id, d.naam, true);
});

// ---------- Eén leerling ----------

function toonDetail(id, naam, stil) {
  socket.emit('tk-detail', { id, naam }, res => {
    if (res.error) {
      if (!stil) Ui.melding(res.error);
      return $('tk-detail').open && $('tk-detail').close();
    }
    tk.detail = res;
    const nu = res.soort === 'proef' && ((tk.taken.find(x => x.id === id) || {}).leerlingen || []).find(x => x.naam === res.naam);
    res.puntenNu = nu ? nu.punten : undefined;
    $('d-naam').textContent = `${res.naam} · ${res.titel}`;
    const info = [STATUS[res.status]];
    const ll = res.soort === 'proef' && ((tk.taken.find(x => x.id === id) || {}).leerlingen || []).find(x => x.naam === res.naam);
    if (res.status !== 'nieuw') info.push(`${res.gedaan} van ${res.totaal} gedaan`, ...(res.soort === 'proef' ? (ll && ll.autoMax ? [`${PfPaper.nl(ll.punten)} van ${PfPaper.nl(ll.autoMax)} punten van de computer${ll.hand ? `, ${PfPaper.ptn(ll.hand)} verbeter jij` : ''}`] : []) : [`${res.juist} van ${res.score} juist`]));
    if (res.reflectie) info.push(`Reflectie: ${reflTekst(res.reflectie)}`);
    $('d-info').textContent = info.join(' · ');
    // Voorlezen aan of uit voor deze leerling, ook terwijl hij werkt.
    const vl = $('d-voorlees');
    vl.classList.toggle('hidden', res.soort !== 'proef' || res.status === 'klaar' || !!res.elders);
    if (res.elders) $('d-info').textContent += ` · werkt op ${res.elders.pc}`;
    vl.dataset.aan = ll && ll.voorlees ? '1' : '';
    vl.textContent = ll && ll.voorlees ? '🔊 Voorlezen: aan' : '🔇 Voorlezen: uit';
    vl.classList.toggle('on', !!(ll && ll.voorlees));
    // Tijdslimiet per leerling: zoals de taak, geen limiet, of een eigen aantal minuten (ook terwijl hij werkt).
    const tsel = $('d-tijd');
    tsel.classList.toggle('hidden', res.soort === 'quiz' || res.status === 'klaar' || !!res.elders);
    const eigen = res.tijdEigen;
    const MIN = [5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120, 150, 180];
    if (eigen && !MIN.includes(eigen)) MIN.push(eigen);
    tsel.innerHTML = [`<option value="">⏱ Zoals de taak (${res.tijdTaak ? `${res.tijdTaak} min` : 'geen limiet'})</option>`, '<option value="0">⏱ Geen tijdslimiet</option>',
      ...MIN.sort((a, b) => a - b).map(m => `<option value="${m}">⏱ ${m} minuten</option>`)].join('');
    tsel.value = eigen === null || eigen === undefined ? '' : String(eigen);
    if (res.geenLimiet) $('d-info').textContent += ' · weer opengezet: geen tijdslimiet meer';
    else if (res.tijd && res.rest !== null && res.status === 'bezig') $('d-info').textContent += ` · ⏱ nog ${Math.ceil(res.rest / 60000)} van ${res.tijd} min`;
    else if (res.tijd && res.status === 'nieuw') $('d-info').textContent += ` · ⏱ ${res.tijd} minuten`;
    if (res.tijdOp) $('d-info').textContent += ' · ⏱ leverde in: de tijd was om';
    const sel = $('d-niveau');
    sel.classList.toggle('hidden', res.niveaus.length < 2);
    sel.innerHTML = res.niveaus.map(n => `<option value="${n}"${n === res.niveau ? ' selected' : ''}>${Niveau.label(n)}</option>`).join('');
    $('d-heropen').classList.toggle('hidden', res.status !== 'klaar');
    $('d-opnieuw').classList.toggle('hidden', res.status === 'nieuw');
    $('d-afwezig').classList.toggle('hidden', res.status === 'klaar');
    $('d-afwezig').classList.toggle('on', !!res.afwezig);
    $('d-afwezig').textContent = res.afwezig ? '🏠 Afwezig: haalt in (klik om weg te halen)' : '🏠 Afwezig: inhalen';
    if (res.afwezig) $('d-info').textContent += ' · afwezig, haalt in';
    if (res.weg && res.weg.length) {
      const klok = e => new Date((Date.parse(res.begin) || 0) + e.t).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
      $('d-info').textContent += ` · ⚠ Verliet de toets ${res.weg.length}×: ${res.weg.map(e => `${klok(e)} ${WEG_SOORT[e.soort] || e.soort}${e.ms ? ` (${Math.round(e.ms / 1000)} s weg)` : ''}`).join(', ')}`;
    }
    const paper = $('d-paper');
    paper.classList.toggle('hidden', res.soort !== 'oefenblad');
    $('d-toets').classList.toggle('hidden', res.soort !== 'proef');
    const quiz = $('d-quiz');
    quiz.innerHTML = '';
    if (res.soort === 'proef') {
      // Wat de leerling invulde, met de sleutel. Open vragen verbeter je bij De Proef › Resultaten.
      PfPaper.render($('d-toets'), res.view.pages, { mode: 'view', nummer: true, answers: res.answers, sleutel: res.sleutel, zones: res.zones, punten: res.status === 'nieuw' ? null : res.punten });
      if (res.afname) {
        const a = el('a', 'button secondary', '✔ Verbeteren bij De Proef');
        a.href = `/proef?verbeter=${encodeURIComponent(res.afname)}`;
        quiz.appendChild(a);
      } else if (res.status !== 'klaar') quiz.appendChild(el('p', 'muted small', 'Na het inleveren verbeter je deze toets bij Toetsen › Afnames en verbeteren.'));
    } else if (res.soort === 'oefenblad') {
      ObSheet.render(paper, res.view, { mode: 'view', answers: res.answers, results: res.results, solutions: res.solutions });
    } else if (!res.vragen.length) {
      quiz.appendChild(el('p', 'muted', 'Nog geen vragen beantwoord.'));
    } else {
      for (const v of res.vragen) {
        const r = el('div', `tk-dq ${v.juist ? 'goed' : 'fout'}`);
        r.append(el('p', '', v.vraag), el('p', 'small', v.juist ? `✔ ${v.goed}` : `✘ ${v.gekozen} · juist: ${v.goed}`));
        quiz.appendChild(r);
      }
    }
    if (!$('tk-detail').open) $('tk-detail').showModal();
  });
}

$('d-sluit').addEventListener('click', () => $('tk-detail').close());
$('d-tijd').addEventListener('change', () => {
  const d = tk.detail;
  const v = $('d-tijd').value;
  socket.emit('tk-tijd', { id: d.id, naam: d.naam, minuten: v === '' ? null : Number(v) }, res => {
    if (res && res.error) Ui.melding(res.error);
    toonDetail(d.id, d.naam, true);
  });
});
$('d-voorlees').addEventListener('click', () => {
  const d = tk.detail;
  socket.emit('tk-voorlees', { id: d.id, naam: d.naam, aan: !$('d-voorlees').dataset.aan }, res => {
    if (res && res.error) return Ui.melding(res.error);
    toonDetail(d.id, d.naam, true);
  });
});
$('d-heropen').addEventListener('click', () => {
  const d = tk.detail;
  socket.emit('tk-heropen', { id: d.id, naam: d.naam }, uit);
});
// Opnieuw beginnen: alles wat de leerling invulde, gaat weg (eerst bevestigen).
$('d-opnieuw').addEventListener('click', async () => {
  const d = tk.detail;
  const toets = d.soort === 'proef';
  if (!await Ui.vraag(`${d.naam} opnieuw laten beginnen? Alle antwoorden van ${d.naam} worden gewist${toets ? ', ook bij de Resultaten in De Proef' : ''}. De leerling begint met een leeg blad.`, { ja: 'Opnieuw beginnen', gevaar: true })) return;
  socket.emit('tk-heropen', { id: d.id, naam: d.naam, opnieuw: true }, uit);
});
$('d-afwezig').addEventListener('click', () => {
  const d = tk.detail;
  socket.emit('tk-afwezig', { id: d.id, naam: d.naam, aan: !d.afwezig }, res => {
    if (res && res.error) return Ui.melding(res.error);
    toonDetail(d.id, d.naam, true);
  });
});
$('d-weg').addEventListener('click', async () => {
  const d = tk.detail;
  if (!await Ui.vraag(`${d.naam} weghalen uit deze taak?`, { ja: 'Weghalen', nee: 'Nee' })) return;
  socket.emit('tk-weg', { id: d.id, naam: d.naam }, res => {
    uit(res);
    $('tk-detail').close();
  });
});
$('d-niveau').addEventListener('change', async () => {
  const d = tk.detail;
  const niveau = $('d-niveau').value;
  if (d.status !== 'nieuw' && !await Ui.vraag(`${d.naam} op ${Niveau.NAMES[niveau]} zetten? Dat is een ander blad: wat al ingevuld was, vervalt.`, { ja: 'Ja', nee: 'Nee' })) {
    $('d-niveau').value = d.niveau;
    return;
  }
  socket.emit('tk-niveau', { id: d.id, naam: d.naam, niveau }, uit);
});

// ---------- Vooraf bekijken ----------

// Het blad of de vragen zoals de leerling ze krijgt, per niveau. Bij een nieuwe taak kan je van hieruit meteen geven.
function bekijk(bron, taak) {
  let niveau = '';
  if (!taak) {
    // Het niveau dat de meeste aangetikte leerlingen krijgen, of het vaste niveau.
    const tel = {};
    for (const n of tk.gekozen) if (tk.per[n]) tel[tk.per[n]] = (tel[tk.per[n]] || 0) + 1;
    niveau = $('tk-niveau').value || Object.keys(tel).sort((a, b) => tel[b] - tel[a])[0] || '';
  }
  // Een toets: proberen zoals de leerling hem krijgt, in een nieuw tabblad (er wordt niets bewaard).
  const toets = bron.soort === 'proef' ? bron.file : taak && taak.soort === 'proef' ? taak.file : null;
  if (toets) return window.open(`/proef-proberen?file=${encodeURIComponent(toets)}${niveau ? `&niveau=${niveau}` : ''}`, '_blank');
  tk.vb = { bron, taak, niveau };
  $('vb-antw').checked = false;
  $('tk-vb').classList.remove('antw');
  laadVoorbeeld();
}

function laadVoorbeeld() {
  const vb = tk.vb;
  socket.emit('tk-inhoud', { ...vb.bron, niveau: vb.niveau }, res => {
    if (res.error) return Ui.melding(res.error);
    vb.niveau = res.niveau;
    $('vb-titel').textContent = res.titel;
    const nv = $('vb-niveaus');
    nv.innerHTML = '';
    nv.classList.toggle('hidden', res.niveaus.length < 2);
    for (const n of res.niveaus) {
      const b = el('button', n === res.niveau ? 'on' : '', Niveau.label(n));
      b.type = 'button';
      b.addEventListener('click', () => { vb.niveau = n; laadVoorbeeld(); });
      nv.appendChild(b);
    }
    $('vb-info').textContent = voorbeeldInfo(res);
    const paper = $('vb-paper');
    const vragen = $('vb-vragen');
    paper.classList.toggle('hidden', res.soort !== 'oefenblad');
    vragen.innerHTML = '';
    if (res.soort === 'oefenblad') {
      vb.res = res;
      tekenBlad();
    } else {
      res.vragen.forEach((v, i) => {
        const k = el('div', 'tk-vb-vraag');
        const p = el('p');
        p.append(el('b', '', `${i + 1}.`), v.vraag);
        const box = el('div', 'answers');
        v.antwoorden.forEach((a, j) => {
          const b = el('div', `answer a${j}`);
          if (j === v.correct) b.dataset.goed = '';
          b.append(el('b', 'rune', j + 1), el('span', 'label', a));
          box.appendChild(b);
        });
        k.append(p, box);
        if (v.uitleg) k.appendChild(el('p', 'q-uitleg', v.uitleg));
        vragen.appendChild(k);
      });
      if (!res.vragen.length) vragen.appendChild(el('p', 'muted', 'Op dit niveau staan geen vragen.'));
    }
    $('vb-acties').classList.toggle('hidden', !!vb.taak);
    $('vb-geef').disabled = $('tk-geef').disabled;
    $('vb-geef').textContent = $('tk-geef').disabled ? 'Tik eerst leerlingen aan' : `Ziet er goed uit: ${$('tk-geef').textContent.toLowerCase()}`;
    if (!$('tk-vb').open) $('tk-vb').showModal();
  });
}

function tekenBlad() {
  const res = tk.vb.res;
  ObSheet.render($('vb-paper'), res.view, { mode: 'view', answers: {}, results: {}, solutions: $('vb-antw').checked ? res.solutions : null });
}

// Wie krijgt dit niveau, en hoe speelt de leerling het?
function voorbeeldInfo(res) {
  const zin = [];
  let namen;
  if (tk.vb.taak) namen = tk.vb.taak.leerlingen.filter(l => res.niveaus.length < 2 || l.niveau === res.niveau).map(l => l.naam);
  else namen = [...tk.gekozen].filter(n => res.niveaus.length < 2 || (tk.per[n] || res.niveau) === res.niveau);
  if (namen.length) zin.push(`Zo krijgen ${namen.length > 4 ? `${namen.slice(0, 4).join(', ')} en nog ${namen.length - 4}` : namen.join(', ')} het.`);
  else if (res.niveaus.length > 1) zin.push(`Niemand ${tk.vb.taak ? 'in deze taak' : 'die je aantikte'} krijgt dit niveau.`);
  const spel = tk.vb.taak ? res.spel && res.spel.naam : $('tk-spel').value && $('tk-spel').selectedOptions[0].textContent.replace(/^Alleen in:\s*/, '');
  if (res.soort === 'quiz') zin.push(spel ? `De leerling speelt alleen in ${spel}: deze vragen komen tussendoor in het spel.` : `${res.vragen.length} ${res.vragen.length === 1 ? 'vraag' : 'vragen'}, een voor een, bij elke leerling in een andere volgorde.`);
  return zin.join(' ');
}

$('tk-bekijk').addEventListener('click', () => bekijk({ soort: tk.soort, file: $('tk-bron').value }));
$('vb-sluit').addEventListener('click', () => $('tk-vb').close());
$('vb-antw').addEventListener('change', () => {
  $('tk-vb').classList.toggle('antw', $('vb-antw').checked);
  if (tk.vb && tk.vb.res && tk.vb.res.soort === 'oefenblad' && !$('vb-paper').classList.contains('hidden')) tekenBlad();
});
$('vb-geef').addEventListener('click', () => {
  $('tk-vb').close();
  $('tk-geef').click();
});

// ---------- Leerlingen erbij ----------

function erbij(t) {
  tk.erbij = { id: t.id, namen: new Set() };
  const al = new Set(t.leerlingen.map(l => l.naam.toLowerCase()));
  const box = $('e-namen');
  box.innerHTML = '';
  const vrij = tk.klas.filter(n => !al.has(n.toLowerCase()));
  if (!vrij.length) box.appendChild(el('p', 'muted', 'Iedereen van de klas heeft deze taak al.'));
  for (const naam of vrij) {
    const b = el('button', 'tk-naam', naam);
    b.type = 'button';
    b.addEventListener('click', () => {
      if (tk.erbij.namen.has(naam)) tk.erbij.namen.delete(naam); else tk.erbij.namen.add(naam);
      b.classList.toggle('on', tk.erbij.namen.has(naam));
    });
    box.appendChild(b);
  }
  $('tk-erbij').showModal();
}
$('e-annuleer').addEventListener('click', () => $('tk-erbij').close());
$('e-ok').addEventListener('click', () => {
  const { id, namen } = tk.erbij;
  $('tk-erbij').close();
  if (namen.size) socket.emit('tk-toevoegen', { id, namen: [...namen] }, uit);
});

// ---------- Instellingen van een gegeven taak ----------
function keuzes(t) {
  socket.emit('tk-keuzes-get', { id: t.id }, k => {
    if (!k || k.error) return Ui.melding((k && k.error) || 'Dat lukte niet.');
    tk.keuzes = k;
    const blad = k.soort === 'oefenblad';
    const quiz = k.soort === 'quiz';
    $('kz-fb-label').classList.toggle('hidden', !blad);
    $('kz-vv-label').classList.toggle('hidden', blad || quiz);
    // Een quiz: alleen de einddatum.
    for (const id of ['kz-vl-label', 'kz-us-label', 'kz-tijd-label']) $(id).classList.toggle('hidden', quiz);
    $('kz-tot-kies').value = k.tot ? 'op' : '';
    $('kz-tot').value = k.tot || '';
    totKeuze('kz-tot-kies', 'kz-tot-label', 'kz-tot');
    const tijdSel = $('kz-tijd');
    if (k.tijd && ![...tijdSel.options].some(o => o.value === String(k.tijd))) tijdSel.add(new Option(`${k.tijd} minuten`, String(k.tijd)));
    tijdSel.value = k.tijd ? String(k.tijd) : '';
    const pogSel = $('kz-pogingen');
    if (k.pogingen > 1 && ![...pogSel.options].some(o => o.value === String(k.pogingen))) pogSel.add(new Option(`${k.pogingen} pogingen`, String(k.pogingen)));
    pogSel.value = k.pogingen > 1 ? String(k.pogingen) : '';
    $('kz-feedback').value = k.feedback;
    $('kz-voorlees').value = k.voorlees;
    $('kz-volgorde').value = k.volgorde;
    $('kz-uitslag').checked = !!k.uitslag;
    $('kz-rf-label').classList.toggle('hidden', k.soort !== 'proef');
    $('kz-reflectie').checked = k.reflectie !== false;
    $('kz-uitleg').textContent = quiz ? 'Met een einddatum sluit de quiz vanzelf. Met meer pogingen mag de leerling na het inleveren zelf opnieuw.' : k.bezig
      ? `Voorlezen, punten tonen en de tijdslimiet gelden meteen, ook voor wie al bezig is. ${blad ? 'Verbeteren' : 'De volgorde'} verandert alleen voor wie nog niet begon.`
      : 'Je kan dit veranderen zolang de taak bestaat.';
    $('tk-keuzes').showModal();
  });
}
$('kz-annuleer').addEventListener('click', () => $('tk-keuzes').close());
$('kz-tot-kies').addEventListener('change', () => totKeuze('kz-tot-kies', 'kz-tot-label', 'kz-tot'));
$('kz-ok').addEventListener('click', () => {
  const k = tk.keuzes;
  const einde = $('kz-tot-kies').value === 'op' ? $('kz-tot').value : null;
  // Een nieuwe einddatum moet in de toekomst liggen (dezelfde als voordien mag blijven staan).
  if (einde && einde !== k.tot && !(Date.parse(einde) > Date.now())) return Ui.melding('Kies een einddatum in de toekomst.');
  $('tk-keuzes').close();
  const d = { id: k.id, tot: einde, pogingen: Number($('kz-pogingen').value) || 1 };
  if (k.soort !== 'quiz') {
    Object.assign(d, { voorlees: $('kz-voorlees').value, uitslag: $('kz-uitslag').checked, tijd: Number($('kz-tijd').value) || null });
    if (k.soort === 'oefenblad') d.feedback = $('kz-feedback').value; else d.volgorde = $('kz-volgorde').value;
    if (k.soort === 'proef') d.reflectie = $('kz-reflectie').checked;
  }
  socket.emit('tk-keuzes', d, res => { if (res && res.error) Ui.melding(res.error); });
});

let openNaam = vraag.get('taak') && vraag.get('naam') ? { id: vraag.get('taak'), naam: vraag.get('naam') } : null;
socket.on('connect', () => {
  // Eerst de gegeven taken (die wil je meteen zien), daarna wat je nodig hebt om een nieuwe taak te geven.
  socket.emit('tk-lijst', null, res => {
    laadBronnen();
    if (res.error) return;
    tk.taken = res.taken;
    // Vanuit Opvolgen (?taak=…&naam=…): de juiste soort tonen en meteen het werk van die leerling openen.
    if (openNaam) {
      const t = tk.taken.find(x => x.id === openNaam.id);
      if (t && t.soort !== tk.soort) {
        tk.soort = t.soort;
        tk.tab = '';
        if (tk.bronnen) vulBron();
        else for (const b of document.querySelectorAll('.tk-soort button')) b.classList.toggle('on', b.dataset.soort === tk.soort);
      }
      if (t) toonDetail(openNaam.id, openNaam.naam);
      openNaam = null;
    }
    tekenTaken();
  });
});
// Thuis klaarzetten: met Mijn lesmap gaan de klaslijst en de taken mee naar het digibord.
socket.on('lesmap', v => {
  $('tk-thuis-tekst').textContent = v && v.lesmap
    ? 'Mijn lesmap is gekoppeld: taken die je hier geeft, staan ook op je andere pc (thuis of op het digibord). Je klaslijst gaat mee.'
    : 'Thuis klaarzetten? Kies bij Instellingen › Lesmap dezelfde map op je pc thuis en op het digibord: je klaslijst en je taken gaan dan vanzelf mee.';
});
socket.on('klas-namen', namen => {
  tk.klas = Array.isArray(namen) ? namen : [];
  socket.emit('tk-bronnen', null, res => { if (res && !res.error) { tk.gast = new Set(res.gast || []); tekenNamen(); } });
  tekenNamen();
});

// ---------- Remediëring na een toets (wens 25 nov, punt 4) ----------
// Eerst zeggen wie wat krijgt, dan per leerling (of groepje met dezelfde fouten) een oefenblad als taak klaarzetten.
function remediering(t) {
  socket.emit('rm-voorstel', { taak_id: t.id }, async v => {
    if (!v || v.error) return Ui.melding((v && v.error) || 'Dat lukte niet.');
    const kan = v.groepen.filter(g => g.kan);
    const n = kan.reduce((s, g) => s + g.namen.length, 0);
    if (!n) return Ui.melding(v.nogTeVerbeteren.length ? 'Niemand had een vraag fout die al verbeterd is. Verbeter eerst de open vragen.' : 'Niemand had een vraag fout (minder dan de helft van de punten).');
    const wie = kan.map(g => `${g.namen.join(', ')}: vraag ${g.vragen.join(', ')}`).join('\n');
    const nog = v.nogTeVerbeteren.length ? `\nNog niet alles verbeterd bij ${v.nogTeVerbeteren.map(x => x.naam).join(', ')}: die vragen tellen nog niet mee.` : '';
    const tekst = `${n === 1 ? '1 leerling krijgt' : `${n} leerlingen krijgen`} een oefenblad met de vragen waarop ze minder dan de helft haalden, in hun eigen versie van de toets. Ze verbeteren meteen en zien hun punten.\n\n${wie}${nog}`;
    if (!await Ui.vraag(tekst, { ja: 'Klaarzetten', nee: 'Nee' })) return;
    socket.emit('rm-maak', { taak_id: t.id }, res => {
      if (!res || res.error) return Ui.melding((res && res.error) || 'Dat lukte niet.');
      Ui.melding(`${res.bladen.filter(b => b.taak_id).length} oefenbladen staan klaar bij Mijn taken. Je vindt ze ook in Maken › Mijn oefenbladen, map ${res.map}.`);
    });
  });
}

// ---------- Live overzicht tijdens een toets (wens 25 nov, punt 8) ----------
// Per leerling: nog niet begonnen, bezig op vraag n (en hoe lang al), lang op één vraag (⚠), of klaar (en hoe laat).
// Het werkt mee met elke wijziging van de leerlingen; de minuten lopen elke 15 seconden bij.
const LIVE_GRENS = 'lancelot-live-grens';
try { const g = localStorage.getItem(LIVE_GRENS); if (g && $('lv-grens').querySelector(`option[value="${g}"]`)) $('lv-grens').value = g; } catch {}
function live(id) {
  tk.live = id;
  tekenLive();
  if (!$('tk-live').open) $('tk-live').showModal();
}
const uurTekst = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${d.getHours()}.${String(d.getMinutes()).padStart(2, '0')}`; };
function tekenLive() {
  const t = tk.taken.find(x => x.id === tk.live);
  if (!t) { $('tk-live').close(); return; }
  const nu = Date.now();
  const grens = Number($('lv-grens').value) || 5;
  const ll = t.leerlingen.filter(l => !l.niet);
  const vast = [];
  $('lv-titel').textContent = `📡 ${t.titel}`;
  $('lv-raster').replaceChildren(...ll.map(l => {
    const toets = t.soort === 'proef';
    const stil = l.actief ? Math.max(0, (nu - Date.parse(l.actief)) / 60000) : 0;
    // Toets: hoe lang op deze vraag. Quiz: hoe lang op de volgende vraag. Oefenblad: hoe lang niets ingevuld.
    const min = l.status !== 'bezig' ? null : toets ? (l.posSinds ? Math.max(0, (nu - Date.parse(l.posSinds)) / 60000) : null) : l.actief ? stil : null;
    const isVast = min !== null && min >= grens && (!toets || stil >= 1);
    const nr = toets ? l.pos + 1 : Math.min(l.gedaan + 1, l.totaal || l.gedaan + 1);
    if (isVast) vast.push(t.soort === 'oefenblad' ? `${l.naam} (${Math.floor(min)} min niets ingevuld)` : `${l.naam} (vraag ${nr}, ${Math.floor(min)} min)`);
    const b = el('button', `tk-live-ll ${l.status}${isVast ? ' vast' : ''}${l.afwezig ? ' inhalen' : ''}`);
    b.type = 'button';
    const naam = el('strong', '', l.naam);
    if (l.elders) naam.append(el('span', 'tk-ll-pc', ` 💻 ${l.elders}`));
    const wat = l.status === 'klaar' ? `✔ Klaar${l.klaar ? ` om ${uurTekst(l.klaar)}` : ''}`
      : l.status === 'bezig' && t.soort === 'oefenblad' ? `${isVast ? '⚠ ' : ''}Bezig${min !== null && min >= 1 ? ` · ${Math.floor(min)} min niets ingevuld` : ''}`
      : l.status === 'bezig' ? `${isVast ? '⚠ ' : ''}Vraag ${nr}${toets ? (l.paginas ? ` van ${l.paginas}` : '') : l.totaal ? ` van ${l.totaal}` : ''}${min !== null ? ` · ${min < 1 ? 'net' : `${Math.floor(min)} min`}` : ''}`
      : l.afwezig ? 'Afwezig: haalt in' : 'Nog niet begonnen';
    const balk = el('span', 'tk-ll-balk');
    balk.appendChild(el('i')).style.width = `${l.status === 'klaar' ? 100 : l.totaal ? (l.gedaan / l.totaal) * 100 : 0}%`;
    b.append(naam, el('span', 'tk-live-wat', wat), el('span', 'tk-live-klein', l.status === 'nieuw' ? '' : t.soort === 'quiz' ? `${l.gedaan} van ${l.totaal} beantwoord${l.score ? ` · ${l.juist} juist` : ''}` : `${l.gedaan} van ${l.totaal} ingevuld`), balk);
    b.title = 'Bekijk het werk van deze leerling';
    b.addEventListener('click', () => toonDetail(t.id, l.naam));
    return b;
  }));
  const n = s => ll.filter(l => l.status === s).length;
  $('lv-samen').textContent = `${n('bezig')} bezig · ${n('klaar')} klaar · ${n('nieuw')} nog niet begonnen`;
  $('lv-vast').textContent = vast.length ? `⚠ Lang vast: ${vast.join(', ')}` : '';
  $('lv-vast').classList.toggle('hidden', !vast.length);
}
$('lv-sluit').addEventListener('click', () => { tk.live = null; $('tk-live').close(); });
$('tk-live').addEventListener('close', () => { tk.live = null; });
$('lv-grens').addEventListener('change', () => { try { localStorage.setItem(LIVE_GRENS, $('lv-grens').value); } catch {} tekenLive(); });
setInterval(() => { if (tk.live && $('tk-live').open) tekenLive(); }, 15000);

// Reflectie na een toets (wens 25 nov, punt 10): kort, voor bij de leerling.
function reflSmiley(z) { return { 1: '😟', 2: '🙂', 3: '😃' }[z] || ''; }
function reflWoord(z) { return { 1: 'niet zeker', 2: 'een beetje zeker', 3: 'heel zeker' }[z] || ''; }
function reflTekst(r) {
  const delen = [];
  if (r.zeker) delen.push(`${reflSmiley(r.zeker)} ${reflWoord(r.zeker)}`);
  if (r.niets) delen.push('niets moeilijk');
  else if ((r.moeilijk || []).length) delen.push(`moeilijk: vraag ${r.moeilijk.join(', ')}`);
  if (r.tekst) delen.push(`"${r.tekst}"`);
  return delen.join(' · ');
}
