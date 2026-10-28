// Taken geven en opvolgen op de pc van de leerkracht.
// Kies een oefenblad of quiz, tik de leerlingen aan (of kies snel: hele klas, een kleur of een groepje uit het zorgoverzicht)
// en geef de taak. Daaronder zie je live per leerling: nog niet begonnen, bezig of klaar, met de score.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const datum = iso => new Date(iso).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });

const tk = { soort: 'oefenblad', bronnen: null, klas: [], gekozen: new Set(), per: {}, eigen: null, vak: null, zorg: null, taken: [], detail: null, erbij: null, vb: null };

// Komt de leerkracht van het zorgoverzicht of een lijst, dan staat de keuze al klaar (?namen=a|b, ?soort=…&file=…).
const vraag = new URLSearchParams(location.search);
if (vraag.get('soort') === 'quiz') tk.soort = 'quiz';
for (const n of (vraag.get('namen') || '').split('|').filter(Boolean)) tk.gekozen.add(n);

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
  spelKeuze();
  const lijst = tk.soort === 'quiz' ? tk.bronnen.quizzen : tk.bronnen.bladen;
  const file = vraag.get('file');
  zetBron(file && lijst.find(x => x.file === file));
}

// De gekozen quiz of het gekozen oefenblad staat op de knop; klik erop om een ander te kiezen.
function zetBron(x) {
  const wat = tk.soort === 'quiz' ? 'een quiz' : 'een oefenblad';
  $('tk-bron').value = x ? x.file : '';
  const b = $('tk-kies');
  b.innerHTML = '';
  if (x) b.append(el('strong', '', x.title), el('span', 'muted', [x.folder ? `📁 ${x.folder.split('/').join(' › ')}` : '', (x.niveaus || []).length > 1 ? '3 niveaus' : ''].filter(Boolean).join(' · ')), el('span', 'tk-kies-ander', 'Ander kiezen'));
  else b.textContent = `📂 Kies ${wat}…`;
  kiesBron();
}

for (const b of document.querySelectorAll('.tk-soort button')) {
  b.addEventListener('click', () => {
    if (tk.soort === b.dataset.soort) return;
    tk.soort = b.dataset.soort;
    vraag.delete('file');
    vulBron();
  });
}

// Kiezen gaat zoals in Mijn quizzen: mappen links, zoeken in alles. Hier alleen kiezen, niets verplaatsen.
for (const soort of ['quiz', 'oefenblad']) {
  ItemList.mount($(`k-${soort}`), {
    kind: soort, kiezen: true, errorId: 'k-fout', go: 'Kies ▶',
    play: q => { $('tk-kiezer').close(); zetBron(q); },
  });
}
$('tk-kies').addEventListener('click', () => {
  $('k-titel').textContent = tk.soort === 'quiz' ? 'Kies een quiz' : 'Kies een oefenblad';
  $('k-quiz').classList.toggle('hidden', tk.soort !== 'quiz');
  $('k-oefenblad').classList.toggle('hidden', tk.soort !== 'oefenblad');
  $('tk-kiezer').showModal();
  const zoek = $(`k-${tk.soort}`).querySelector('.lib-zoek');
  if (zoek) zoek.focus();
});
$('k-sluit').addEventListener('click', () => $('tk-kiezer').close());

// Welk niveau krijgt elke leerling? Dat tonen we bij de namen.
function kiesBron() {
  const file = $('tk-bron').value;
  tk.per = {};
  tk.eigen = tk.vak = null;
  $('tk-bron-info').textContent = '';
  $('tk-nv-label').classList.add('hidden');
  $('tk-niveau').innerHTML = '';
  if (!file) return tekenNamen();
  socket.emit('tk-voorbeeld', { soort: tk.soort, file }, res => {
    if (res.error) return ($('tk-bron-info').textContent = res.error);
    if ($('tk-bron').value !== file) return;
    tk.eigen = res.niveaus.length > 1 ? res : null;
    tk.vak = res.vak;
    // Standaard elk zijn eigen niveau; de leerkracht kan ook iedereen op één niveau zetten.
    $('tk-nv-label').classList.toggle('hidden', !tk.eigen);
    if (tk.eigen) $('tk-niveau').innerHTML = '<option value="">Eigen niveau van elke leerling</option>'
      + res.niveaus.map(n => `<option value="${n}">Iedereen ${Niveau.label(n)}</option>`).join('');
    kiesNiveau();
  });
}

function kiesNiveau() {
  const res = tk.eigen, vast = $('tk-niveau').value;
  tk.per = {};
  if (res) for (const naam of Object.keys(res.per)) tk.per[naam] = vast || res.per[naam];
  $('tk-bron-info').textContent = !res
    ? $('tk-bron').value ? `Eén niveau: iedereen krijgt hetzelfde${tk.vak ? ` (${tk.vak})` : ''}.` : ''
    : vast ? `Iedereen die je aantikt, krijgt ${Niveau.NAMES[vast]} (${Niveau.HELP[vast]}), los van zijn niveau in Mijn klas.`
    : `Op ${res.niveaus.length} niveaus${res.vak ? ` (${res.vak})` : ''}: elke leerling krijgt het niveau dat bij zijn naam staat, zoals in Mijn klas.`;
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
    const n = tk.per[naam];
    if (n) b.appendChild(el('span', `tk-nv ${n}`, Niveau.ICONS[n])).title = Niveau.NAMES[n];
    b.addEventListener('click', () => {
      if (tk.gekozen.has(naam)) tk.gekozen.delete(naam); else tk.gekozen.add(naam);
      b.classList.toggle('on', tk.gekozen.has(naam));
      knop();
    });
    box.appendChild(b);
  }
  knop();
}

function knop() {
  const n = tk.gekozen.size;
  $('tk-geef').disabled = !n || !$('tk-bron').value;
  $('tk-bekijk').disabled = !$('tk-bron').value;
  $('tk-geef').textContent = !n ? 'Tik eerst leerlingen aan' : n === tk.klas.length && n > 1 ? 'Geef taak aan de hele klas' : `Geef taak aan ${n} ${n === 1 ? 'leerling' : 'leerlingen'}`;
}

function kiesNamen(namen, erbij = false) {
  if (!erbij) tk.gekozen.clear();
  for (const n of namen) if (tk.klas.includes(n)) tk.gekozen.add(n);
  tekenNamen();
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
    b.textContent = `${k === 'rood' ? '🔴 Aandacht nodig' : '🟠 Opvolgen'} (${n})`;
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
  if (w === 'alle') kiesNamen(tk.klas);
  else if (w === 'geen') kiesNamen([]);
  else kiesNamen(tk.zorg.leerlingen.filter(l => l.opLijst && l.kleur === w).map(l => l.naam));
});
$('tk-groepje').addEventListener('change', () => {
  const v = $('tk-groepje').value;
  if (v) kiesNamen(v.split('|'));
  $('tk-groepje').value = '';
});

$('tk-geef').addEventListener('click', () => {
  const namen = [...tk.gekozen];
  const b = $('tk-geef');
  b.disabled = true;
  socket.emit('tk-maak', { soort: tk.soort, file: $('tk-bron').value, namen, feedback: $('tk-feedback').value, spel: $('tk-spel').value, minuten: Number($('tk-minuten').value), niveau: $('tk-niveau').value }, res => {
    knop();
    if (res.error) return ($('tk-fout').textContent = res.error);
    $('tk-fout').textContent = '';
    // Volgende taak weer standaard op ieders eigen niveau.
    $('tk-niveau').value = '';
    kiesNiveau();
    kiesNamen([]);
    Ui.melding(`De taak staat klaar bij ${namen.length === 1 ? namen[0] : `${namen.length} leerlingen`}. Zij vinden ze op hun toestel bij Mijn taken.`);
  });
});

// ---------- Gegeven taken ----------

const STATUS = { nieuw: 'Nog niet begonnen', bezig: 'Bezig', klaar: 'Klaar' };

function tekenTaken() {
  const box = $('tk-taken');
  const toon = $('tk-toon-dicht').checked;
  const lijst = tk.taken.filter(t => toon || !t.dicht);
  $('tk-geen').classList.toggle('hidden', lijst.length > 0);
  $('tk-geen').textContent = tk.taken.length ? 'Geen open taken. Vink aan om de afgesloten taken te zien.' : 'Nog geen taken gegeven.';
  box.innerHTML = '';
  for (const t of lijst) box.appendChild(kaart(t));
}

function kaart(t) {
  const k = el('div', `panel tk-taak${t.dicht ? ' dicht' : ''}`);
  const kop = el('div', 'tk-taak-kop');
  const img = el('img');
  img.src = `/img/icons/${t.spel ? t.spel.icoon : t.soort === 'quiz' ? 'toernooi' : 'oefenblad'}.webp`;
  img.alt = '';
  const tel = s => t.leerlingen.filter(l => l.status === s).length;
  const titel = el('div', 'tk-taak-titel');
  titel.append(el('strong', '', t.titel), el('small', 'muted', `${t.soort === 'quiz' ? 'Quiz' : 'Oefenblad'}${t.spel ? ` in ${t.spel.naam}` : ''}${t.vak ? ` · ${t.vak}` : ''}${t.niveau ? ` · iedereen ${Niveau.NAMES[t.niveau]}` : ''}${t.uitLesmap ? ' · uit je lesmap' : ''} · ${datum(t.gemaakt)}${t.dicht ? ' · afgesloten' : ''}`));
  const telling = el('div', 'tk-telling');
  telling.append(el('span', 'klaar', `${tel('klaar')} klaar`), el('span', 'bezig', `${tel('bezig')} bezig`), el('span', 'nieuw', `${tel('nieuw')} nog niet`));
  const acties = el('div', 'actions');
  const knopje = (tekst, fn, cls = 'secondary') => {
    const b = el('button', `${cls} tk-mini`, tekst);
    b.addEventListener('click', fn);
    acties.appendChild(b);
  };
  if (!t.dicht) knopje('+ Leerlingen', () => erbij(t));
  knopje('👁 Bekijk', () => bekijk({ id: t.id }, t));
  if (t.dicht) knopje('🔓 Weer openen', () => socket.emit('tk-heropen', { id: t.id }, uit));
  else knopje('🔒 Afsluiten', async () => {
    if (await Ui.vraag('Deze taak afsluiten? Wie bezig is, levert in zoals het er nu staat. Wie nog niet begon, telt niet mee.', { ja: 'Afsluiten', nee: 'Nee' })) socket.emit('tk-sluit', { id: t.id }, uit);
  });
  knopje('🗑', async () => {
    if (await Ui.vraag(`De taak "${t.titel}" wissen? Wat leerlingen al deden, blijft in het logboek.`, { ja: 'Wissen', nee: 'Nee' })) socket.emit('tk-wis', { id: t.id }, uit);
  });
  kop.append(img, titel, telling, acties);

  const rij = el('div', 'tk-leerlingen');
  for (const l of t.leerlingen) {
    const b = el('button', `tk-ll ${l.status}`);
    b.type = 'button';
    const naam = el('span', 'tk-ll-naam', l.naam);
    if (t.niveaus.length > 1) naam.prepend(el('span', `tk-nv ${l.niveau}`, Niveau.ICONS[l.niveau]));
    const stand = l.status === 'klaar'
      ? (l.score ? `${l.juist}/${l.score}` : '✔')
      : l.status === 'bezig' ? `${l.gedaan}/${l.totaal}` : '–';
    const pct = l.status === 'klaar' && l.score ? l.juist / l.score : null;
    const s = el('span', `tk-ll-stand${pct === null ? '' : pct >= .8 ? ' hoog' : pct < .5 ? ' laag' : ''}`, stand);
    const balk = el('span', 'tk-ll-balk');
    balk.appendChild(el('i')).style.width = `${l.status === 'klaar' ? 100 : l.totaal ? (l.gedaan / l.totaal) * 100 : 0}%`;
    b.title = STATUS[l.status];
    b.append(naam, s, balk);
    b.addEventListener('click', () => toonDetail(t.id, l.naam));
    rij.appendChild(b);
  }
  k.append(kop, rij);
  return k;
}

function uit(res) {
  if (res && res.error) Ui.melding(res.error);
}

$('tk-toon-dicht').addEventListener('change', tekenTaken);
socket.on('tk-lijst', lijst => {
  tk.taken = lijst;
  tekenTaken();
  // Staat een leerling open, dan alleen opnieuw tekenen als bij hem iets veranderde.
  const d = tk.detail;
  if (!d || !$('tk-detail').open) return;
  const t = lijst.find(x => x.id === d.id);
  const l = t && t.leerlingen.find(x => x.naam === d.naam);
  if (!l || l.status !== d.status || l.gedaan !== d.gedaan || l.juist !== d.juist || l.niveau !== d.niveau) toonDetail(d.id, d.naam, true);
});

// ---------- Eén leerling ----------

function toonDetail(id, naam, stil) {
  socket.emit('tk-detail', { id, naam }, res => {
    if (res.error) {
      if (!stil) Ui.melding(res.error);
      return $('tk-detail').open && $('tk-detail').close();
    }
    tk.detail = res;
    $('d-naam').textContent = `${res.naam} · ${res.titel}`;
    const info = [STATUS[res.status]];
    if (res.status !== 'nieuw') info.push(`${res.gedaan} van ${res.totaal} gedaan`, `${res.juist} van ${res.score} juist`);
    $('d-info').textContent = info.join(' · ');
    const sel = $('d-niveau');
    sel.classList.toggle('hidden', res.niveaus.length < 2);
    sel.innerHTML = res.niveaus.map(n => `<option value="${n}"${n === res.niveau ? ' selected' : ''}>${Niveau.label(n)}</option>`).join('');
    $('d-heropen').classList.toggle('hidden', res.status !== 'klaar');
    const paper = $('d-paper');
    paper.classList.toggle('hidden', res.soort !== 'oefenblad');
    const quiz = $('d-quiz');
    quiz.innerHTML = '';
    if (res.soort === 'oefenblad') {
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
$('d-heropen').addEventListener('click', () => {
  const d = tk.detail;
  socket.emit('tk-heropen', { id: d.id, naam: d.naam }, uit);
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

socket.on('connect', () => {
  laadBronnen();
  socket.emit('tk-lijst', null, res => {
    if (res.error) return;
    tk.taken = res.taken;
    tekenTaken();
  });
});
socket.on('klas-namen', namen => {
  tk.klas = Array.isArray(namen) ? namen : [];
  tekenNamen();
});
