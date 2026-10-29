// De Proef voor de leerkracht: toetsen maken (zelf of met AI, ook vanuit je eigen toets-pdf), afnemen en verbeteren.
// Gebruikt PfKern (pf-kern.js), PfPaper (pf-paper.js), PfKnip (pf-knip.js), ItemList (quiz-list.js), DoelKies, Niveau, sfx en loadGame (fx.js).
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const esc = PfPaper.esc;
const nl = PfPaper.nl;
const TYPE_ICONS = PfEdit.ICONS;
const vraagKaart = PfEdit.kaart;
const leesKaart = PfEdit.lees;
const alsBron = PfEdit.alsBron;
PfEdit.config({ preview: () => preview(), ai: () => (hasKey ? aiSleutel : null), niveau: () => $('a-level').value });
let state = null;
let hostToets = null;
let hasKey = false;

let view = 'list';
const VIEWS = ['list', 'maker', 'editor', 'lobby', 'verbeter'];
function show(name) {
  if (view !== name) window.scrollTo(0, 0);
  view = name;
  for (const s of VIEWS) $(s).classList.toggle('hidden', s !== name);
  document.body.classList.toggle('breed', name === 'editor');
}

document.addEventListener('click', () => sfx.unlock(), { once: true });
$('mute').innerHTML = Ui.ic(sfx.muted ? 'stil' : 'geluid');
$('mute').addEventListener('click', () => { $('mute').innerHTML = Ui.ic(sfx.toggle() ? 'stil' : 'geluid'); });
$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });
for (const b of document.querySelectorAll('[data-back]')) b.addEventListener('click', () => show(b.dataset.back));

socket.on('settings', s => {
  Ui.zetAi(s);
  hasKey = s.hasKey;
  $('a-key-panel').classList.toggle('hidden', !hasKey || modus() === 'blad');
  $('a-blad-ai-label').classList.toggle('hidden', !hasKey);
  $('b-key').classList.toggle('hidden', !hasKey);
  $('a-copy-nr').textContent = hasKey ? '3' : '2';
  $('a-copy-kop').textContent = hasKey ? 'Of: kopieer de prompt naar een chatbot' : 'Kopieer de prompt naar een chatbot';
});

function downloadLink(file) {
  const link = document.createElement('a');
  link.href = `/resultaten/${encodeURIComponent(file)}`;
  link.download = file;
  link.textContent = 'Download voor Excel';
  return link;
}


// ---------- Lijst ----------

ItemList.mount($('toets-list'), {
  kind: 'proef',
  errorId: 'list-error',
  go: 'Afnemen ▶',
  detail: t => `${t.count} vragen · ${nl(t.punten)} punten · ${t.types.map(x => TYPE_ICONS[x] || '').join(' ')}${(t.niveaus || []).length > 1 ? ` · ${t.niveaus.map(n => Niveau.ICONS[n]).join('')}` : ''}${t.klaar ? '' : ' · ⚠ nog niet klaar'}`,
  play: t => afnemen(t.file),
  buttons: [
    { label: '🖨 Print', cls: 'print', title: 'Afdrukken', click: t => window.open(`/proef-print?file=${encodeURIComponent(t.file)}`, '_blank') },
    { label: 'Verbeterblad', cls: 'key', title: 'Verbetersleutel afdrukken', click: t => window.open(`/proef-print?file=${encodeURIComponent(t.file)}&sleutel=1`, '_blank') },
  ],
  edit: t => {
    socket.emit('pf-open', t.file, res => {
      if (res.error) return ($('list-error').textContent = res.error);
      openEditor(res.toets, t.file);
    });
  },
  remove: async t => {
    if (!await Ui.vraag(`"${t.title}" verwijderen?`)) return;
    socket.emit('pf-delete', t.file, res => { $('list-error').textContent = res.error || ''; });
  },
});

// De instellingen om af te nemen, onthouden op deze pc.
const INST = ['tijd', 'slot', 'scherm', 'schudden', 'terug', 'uitslag', 'niveau', 'voorlees'];
function leesInst() {
  const v = id => $(`i-${id}`);
  return {
    tijd: Number(v('tijd').value) || 0, slot: v('slot').value, scherm: v('scherm').checked, schudden: v('schudden').checked,
    terug: v('terug').checked, uitslag: v('uitslag').checked, niveau: v('niveau').value, voorlees: v('voorlees').value,
  };
}
try {
  const saved = JSON.parse(localStorage.getItem('lancelot-pf-inst') || '{}');
  for (const k of INST) {
    const el = $(`i-${k}`);
    if (saved[k] === undefined) continue;
    if (el.type === 'checkbox') el.checked = !!saved[k];
    else el.value = saved[k] || '';
  }
} catch {}
for (const k of INST) $(`i-${k}`).addEventListener('change', () => { try { localStorage.setItem('lancelot-pf-inst', JSON.stringify(leesInst())); } catch {} });

function afnemen(file) {
  $('stopped').classList.add('hidden');
  loadGame('pf-load', { file, inst: leesInst() }, res => {
    $('list-error').textContent = res.error || '';
    $('e-error').textContent = res.error || '';
    if (res.error && view === 'editor') $('e-error').scrollIntoView({ block: 'center' });
  });
}

// Afgenomen toetsen: verder verbeteren.
let afnames = [];
socket.on('pf-afnames', list => {
  afnames = list || [];
  const box = $('afnames');
  if (!afnames.length) {
    box.innerHTML = '<p class="muted small">Nog geen toetsen afgenomen. Na het afsluiten van een toets verschijnt hij hier.</p>';
    return;
  }
  box.innerHTML = afnames.map(a => `<div class="pf-afname">
      <button class="play" data-file="${esc(a.file)}">${esc(a.title)} <span class="muted">· ${new Date(a.datum).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} · ${a.leerlingen} ${a.leerlingen === 1 ? 'leerling' : 'leerlingen'}</span>
      <span class="tag ${a.klaar && !a.open ? 'ok' : 'todo'}">${a.open ? `${a.open} te verbeteren` : a.klaar ? '✔ klaar' : 'nakijken'}</span></button>
      <button class="secondary small-btn" data-weg="${esc(a.file)}" title="Verwijderen" aria-label="Verwijderen">✕</button></div>`).join('');
  for (const b of box.querySelectorAll('[data-file]')) b.addEventListener('click', () => openAfname(b.dataset.file));
  for (const b of box.querySelectorAll('[data-weg]')) {
    b.addEventListener('click', async () => {
      if (!await Ui.vraag('Deze afname verwijderen? De antwoorden en punten van de leerlingen gaan naar de prullenbak. Wat al in het logboek of in Excel staat, blijft.')) return;
      socket.emit('pf-afname-weg', b.dataset.weg, res => { if (res.error) Ui.melding(res.error); });
    });
  }
});

// ---------- Maken met AI ----------

let bronnen = []; // { naam, mimeType, size, data } voor de AI; PfKnip onthoudt dezelfde bestanden om te knippen
const MAX_BRON = 18 * 1024 * 1024;
let makerDoel = null;
const modus = () => document.querySelector('input[name="a-modus"]:checked').value;

const FORMATS = {
  meerkeuze: '{ "type": "meerkeuze", "vraag": "de vraag", "opties": ["keuze A", "keuze B", "keuze C", "keuze D"], "juist": 2, "punten": 1 }',
  juistfout: '{ "type": "juistfout", "vraag": "een stelling", "juist": false, "punten": 1 }',
  invullen: '{ "type": "invullen", "vraag": "Vul aan.", "tekst": "Een zin met een gat: de hoofdstad van België is [Brussel]. Meerdere goede antwoorden: [fiets|velo].", "punten": 2 }',
  kort: '{ "type": "kort", "vraag": "de vraag", "antwoord": "het antwoord|andere goede schrijfwijze", "eenheid": "", "punten": 1 }',
  breuk: '{ "type": "kort", "vraag": "Vereenvoudig 6/8.", "antwoord": "3/4", "breuk": true, "vereenvoudigd": true, "punten": 1 }',
  rekenen: '{ "type": "rekenen", "vraag": "een vraagstuk", "antwoord": "36", "eenheid": "cm", "punten": 1, "werkPunten": 1 }',
  verbinden: '{ "type": "verbinden", "vraag": "Verbind wat bij elkaar hoort.", "paren": [["links", "rechts"], ["links", "rechts"]], "punten": 4 }',
  ordenen: '{ "type": "ordenen", "vraag": "Zet in de juiste volgorde.", "items": ["eerste", "tweede", "derde"], "punten": 1 }',
  tabel: '{ "type": "tabel", "vraag": "Vul de tabel aan.", "rijen": [["kg", "g"], ["2", "[2000]"], ["[0,5]", "500"]], "punten": 2 }',
  aanduiden: '{ "type": "aanduiden", "vraag": "Duid Antwerpen aan op de kaart.", "beeldPagina": 2, "beeldNodig": "kaart van België", "punten": 1 }',
  getallenas: '{ "type": "getallenas", "vraag": "Duid 3/4 aan op de getallenas.", "min": "0", "max": "2", "stap": "1/4", "antwoord": "3/4", "getallen": "rand", "breuk": true, "punten": 1 }',
  markeren: '{ "type": "markeren", "vraag": "Duid alle werkwoorden aan.", "tekst": "De hond [blaft] en de kat [slaapt] in de zon.", "punten": 2 }',
  tekenen: '{ "type": "tekenen", "vraag": "Teken een rechthoek met een omtrek van 12 cm.", "model": "waar de leerkracht op let", "punten": 2 }',
  spreken: '{ "type": "spreken", "vraag": "Stel jezelf voor in het Frans: naam, leeftijd en woonplaats.", "seconden": 60, "model": "waar de leerkracht op let", "punten": 3 }',
  open: '{ "type": "open", "vraag": "een open vraag", "model": "het modelantwoord en wat er zeker in moet staan", "regels": 3, "punten": 2 }',
  papier: '{ "type": "papier", "vraag": "Teken een hoek van 45° met je geodriehoek.", "model": "waar de leerkracht op let", "punten": 2 }',
  bron: '{ "type": "bron", "titel": "titel van de bron", "tekst": "de leestekst of de gegevens", "vragen": [ ...deelvragen in dezelfde vorm als hierboven... ] }',
};

function chosenTypes() {
  return [...$('a-types').querySelectorAll('input:checked')].map(i => i.value);
}

function buildPrompt(metBestanden) {
  const over = modus() === 'over';
  const codes = makerDoel ? makerDoel.codes() : [];
  const level = $('a-level').value;
  const topic = $('a-topic').value.trim();
  const extra = $('a-extra').value.trim();
  const drie = $('a-niveaus').checked;
  const types = over ? Object.keys(FORMATS).filter(t => t !== 'spreken') : [...new Set([...chosenTypes(), 'papier'])];
  if (!over && !types.some(t => t !== 'papier' && t !== 'bron')) types.push('meerkeuze', 'kort');
  if (!over && (types.includes('kort') || types.includes('rekenen'))) types.push('breuk');
  const count = Math.min(60, Math.max(3, Number($('a-count').value) || 15));
  const bijlage = metBestanden ? 'de bijgevoegde bestanden' : 'de pdf of foto die ik zo meteen toevoeg';
  const vragen = `[
    ${types.map(t => FORMATS[t]).join(',\n    ')}
  ]`;
  const taak = over
    ? `Ik geef je mijn eigen toets in ${bijlage}. Zet hem om in een digitale toets voor LANcelot, voor leerlingen uit: ${level} (Belgisch onderwijs).${topic ? ` Titel of onderwerp: ${topic}.` : ''}
Regels:
- Neem elke vraag van de toets over, in dezelfde volgorde en met dezelfde punten als op de toets. Staan er geen punten bij, geef dan 1 punt per antwoord.
- Verander de inhoud niet. Kies per vraag de soort die het best past. Een vraag met deelvragen a, b, c over een tekst, tabel of prent wordt een "bron".
- Heeft een vraag een prent, kaart, grafiek, figuur of foto nodig, zet dan "beeldPagina" (het paginanummer in de pdf) en "beeldNodig" (een korte omschrijving van wat er moet uitgeknipt worden). Typ tabellen en gewone teksten liever over.
- Een opdracht om iets te tekenen of te schetsen wordt "tekenen" (met "beeldPagina" en "beeldNodig" als er op een figuur getekend wordt). Wat digitaal niet goed kan (construeren met passer of geodriehoek, meten met een lat) wordt "papier".
- Een getal aanduiden op een getallenas wordt "getallenas"; woorden onderstrepen of omcirkelen in een zin of tekst wordt "markeren"; een woord omcirkelen uit een paar keuzes in een zin wordt een keuzelijstje bij invullen.
- Geef bij elke vraag het juiste antwoord. Staat er geen verbetersleutel bij, los de vraag dan zelf op en controleer je antwoord twee keer.`
    : `Maak een nieuwe toets voor leerlingen uit: ${level} (Belgisch onderwijs)${topic ? ` over: ${topic}` : ''}.${metBestanden || $('a-files').dataset.heeft ? `\nBaseer alle vragen op ${bijlage}. Vraag alleen naar wat daarin staat.` : ''}
Regels:
- Maak ongeveer ${count} vragen${drie ? ' per niveau' : ''}, in het Nederlands zoals in Vlaanderen.
- Gebruik deze soorten, afwisselend: ${types.filter(t => t !== 'papier' && t !== 'breuk').join(', ')}.
- Bouw op van kennis (begrippen, feiten) naar begrip en toepassen in een herkenbare situatie.
- Bij meerkeuze en juist/fout zijn de foute keuzes typische fouten of misvattingen, geen onzin. Zet het juiste antwoord niet steeds op dezelfde plek.
- Heeft een vraag een afbeelding uit de lesstof nodig, zet dan "beeldPagina" (het paginanummer in de pdf) en "beeldNodig" (een korte omschrijving).
- Geef elke vraag punten: 1 punt voor een eenvoudige vraag, meer voor een vraag met meerdere antwoorden of denkstappen.`;
  return `Je bent een ervaren leerkracht in Vlaanderen. ${taak}
${DoelKies.prompt(codes, 'vragen')}${extra ? `\nExtra wensen van de leerkracht:\n${extra}\n` : ''}
Over de soorten vragen:
- "juist" bij meerkeuze is het nummer van het juiste antwoord, geteld vanaf 0. Zijn er meerdere juiste antwoorden, geef dan een lijst: "juist": [0, 2].
- Bij invullen staat elk in te vullen woord tussen [vierkante haken]. Een keuzelijstje schrijf je als {juist|fout|fout} met het juiste antwoord eerst. Bij een tabel staat een in te vullen cel tussen [ ], een keuzelijstje in een cel als {juist|fout}.
- Is het antwoord een breuk, zet dan bij kort of rekenen "breuk": true (de leerling krijgt een breukvak); moet de breuk vereenvoudigd zijn, ook "vereenvoudigd": true.
- Bij kort antwoord en rekenvragen mag "antwoord" meerdere goede schrijfwijzen hebben, gescheiden door |. Getallen met een komma: 0,5.
- Bij een rekenvraag is "punten" voor de uitkomst en "werkPunten" voor de bewerking (die verbetert de leerkracht).
- Bij markeren staan de woorden die de leerling moet aanduiden tussen [ ]. Bij een getallenas ligt het juiste getal op een streepje (een veelvoud van de stap vanaf het begin).
- Bij open vragen, tekenen, inspreken en vragen op papier zet je in "model" wat een goed antwoord is, zodat de leerkracht snel kan verbeteren.
- Gebruik de Belgische schrijfwijze en context: komma als decimaalteken, euro, Belgische namen en plaatsen.
${drie ? `\n${Niveau.prompt(level, 'vragen')}\n` : ''}
Belangrijk: maak GEEN interactieve quiz, app, webpagina of canvas en schrijf geen code. Ik heb enkel de gegevens nodig als tekst.
Geef je antwoord als één codeblok met JSON (\`\`\`json … \`\`\`), zonder uitleg ervoor of erna, precies in dit formaat:
${drie ? `{
  "title": "korte titel van de toets",
  "intro": "een korte uitleg voor de leerlingen (mag leeg)",
  "niveaus": {
    "page": [ ...de vragen met hulp, in dezelfde vorm als bij schildknaap... ],
    "schildknaap": ${vragen.replace(/\n/g, '\n    ')},
    "ridder": [ ...de uitdagende vragen, in dezelfde vorm als bij schildknaap... ]
  }
}` : `{
  "title": "korte titel van de toets",
  "intro": "een korte uitleg voor de leerlingen (mag leeg)",
  "vragen": ${vragen}
}`}
Het voorbeeld toont elke soort één keer; gebruik in je toets de soorten die passen, zo vaak als nodig.`;
}

makerDoel = DoelKies.multi({
  onChange: codes => {
    const doel = DoelKies.find(codes[0]);
    if (doel) $('a-level').value = DoelKies.naam(doel.leerjaar);
    updatePrompt();
  },
});
$('a-doel').appendChild(makerDoel);

function updatePrompt() {
  const m = modus();
  for (const el of document.querySelectorAll('.pf-nieuw')) el.classList.toggle('hidden', m !== 'nieuw');
  for (const el of document.querySelectorAll('.pf-niet-blad')) el.classList.toggle('hidden', m === 'blad' || (el.id === 'a-key-panel' && !hasKey));
  for (const el of document.querySelectorAll('.pf-alleen-blad')) el.classList.toggle('hidden', m !== 'blad');
  $('a-niveaus').closest('label').classList.toggle('hidden', m === 'blad');
  $('a-extra').closest('label').classList.toggle('hidden', m === 'blad');
  $('a-prompt').value = buildPrompt(false);
  $('a-copied').textContent = '';
}
for (const id of ['a-topic', 'a-level', 'a-count', 'a-extra', 'a-niveaus']) $(id).addEventListener('input', updatePrompt);
$('a-types').addEventListener('change', updatePrompt);
$('a-modus').addEventListener('change', updatePrompt);
updatePrompt();

$('new-ai').addEventListener('click', () => {
  $('a-error').textContent = '';
  $('a-key-error').textContent = '';
  DoelKies.leerjaar(lj => {
    if (!makerDoel.codes().length) {
      $('a-level').value = DoelKies.naam(lj);
      updatePrompt();
    }
  });
  show('maker');
});

let promptCopied = false;
let lastClipboard = '';
async function kopieer(tekst, el) {
  try {
    await navigator.clipboard.writeText(tekst);
  } catch {
    const t = document.createElement('textarea');
    t.value = tekst;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
  promptCopied = true;
  lastClipboard = tekst;
  if (el) el.textContent = 'Gekopieerd! Plak hem in de chatbot, voeg je pdf of foto toe, kopieer het antwoord en kom hier terug.';
}
$('a-copy').addEventListener('click', () => kopieer($('a-prompt').value, $('a-copied')));
for (const b of document.querySelectorAll('.chatbot')) {
  b.addEventListener('click', () => {
    window.open(b.dataset.url, '_blank', 'noopener');
    kopieer($('a-prompt').value, $('a-copied'));
  });
}

function parseAnswer(text, quiet) {
  socket.emit('pf-parse', text, res => {
    if (res.error) {
      if (!quiet) $('a-error').textContent = res.error;
      return;
    }
    $('a-error').textContent = '';
    $('a-answer').value = '';
    openEditor(metDoel(res.toets), null);
  });
}
$('a-parse').addEventListener('click', () => parseAnswer($('a-answer').value, false));
$('a-answer').addEventListener('paste', () => setTimeout(() => parseAnswer($('a-answer').value, false), 0));

// Terug uit de chatbot: staat het antwoord al op het klembord?
window.addEventListener('focus', async () => {
  if (!promptCopied || !navigator.clipboard?.readText || !['maker', 'editor'].includes(view)) return;
  let text;
  try { text = await navigator.clipboard.readText(); } catch { return; }
  if (!text || text === lastClipboard) return;
  if (view === 'editor' && sleutelWacht && text.includes('"velden"')) {
    lastClipboard = text;
    return zetAlleSleutels(text);
  }
  if (!(text.includes('"vragen"') || text.includes('"niveaus"'))) return;
  lastClipboard = text;
  if (view === 'maker') parseAnswer(text, true);
  else bijgestuurd(text, true);
});

function metDoel(t) {
  const codes = makerDoel ? makerDoel.codes() : [];
  if (!codes.length) return t;
  for (const lijst of [t.vragen, t.page, t.ridder]) {
    if (!lijst) continue;
    DoelKies.apply(lijst.flatMap(q => (q.type === 'bron' ? q.vragen : [q])), codes);
  }
  return t;
}

function renderBronnen() {
  const list = $('a-file-list');
  list.innerHTML = '';
  $('a-files').dataset.heeft = bronnen.length ? '1' : '';
  bronnen.forEach((b, i) => {
    const li = document.createElement('li');
    li.innerHTML = '<span></span><button class="secondary" title="Verwijderen">✕</button>';
    li.querySelector('span').textContent = `${b.naam} (${Math.ceil(b.size / 1024)} kB)`;
    li.querySelector('button').addEventListener('click', () => { PfKnip.vergeet(b.naam); bronnen.splice(i, 1); renderBronnen(); });
    list.appendChild(li);
  });
  updatePrompt();
}

function addBron(file) {
  if (!/^image\/|^application\/pdf$/.test(file.type)) return Ui.melding(`${file.name}: alleen pdf's en afbeeldingen.`);
  if (bronnen.reduce((s, b) => s + b.size, 0) + file.size > MAX_BRON) return Ui.melding('Samen groter dan 18 MB. Kies minder of kleinere bestanden.');
  const reader = new FileReader();
  reader.onload = () => {
    bronnen.push({ naam: file.name, mimeType: file.type, size: file.size, data: reader.result.split(',')[1] });
    renderBronnen();
  };
  reader.readAsDataURL(file);
  PfKnip.voegToe(file);
}
$('a-files').addEventListener('change', e => {
  [...e.target.files].forEach(addBron);
  e.target.value = '';
});
const drop = $('a-drop');
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => {
  e.preventDefault();
  drop.classList.remove('over');
  [...e.dataTransfer.files].forEach(addBron);
});
document.addEventListener('paste', e => {
  if (view !== 'maker' || e.target.id === 'a-answer' || !$('knip').classList.contains('hidden')) return;
  const files = [...(e.clipboardData?.files || [])];
  if (!files.length) return;
  e.preventDefault();
  files.forEach((f, i) => addBron(new File([f], f.name === 'image.png' ? `screenshot-${bronnen.length + i + 1}.png` : f.name, { type: f.type })));
});

$('a-key').addEventListener('click', () => {
  $('a-key-error').textContent = '';
  if (modus() === 'over' && !bronnen.length) return ($('a-key-error').textContent = 'Voeg eerst je toets toe (pdf, scan of foto).');
  $('a-key').disabled = true;
  $('a-key-busy').textContent = `${Ui.ai} is bezig… dit duurt meestal 20 tot 60 seconden.`;
  socket.emit('pf-generate', { prompt: buildPrompt(true), files: bronnen.map(({ mimeType, data }) => ({ mimeType, data })) }, res => {
    $('a-key').disabled = false;
    $('a-key-busy').textContent = '';
    if (res.error) return ($('a-key-error').textContent = res.error);
    openEditor(metDoel(res.toets), null);
  });
});

// ---------- Mijn pdf zoals hij is ----------
// Elke pagina wordt een blad met vakjes (PfBlad, pf-blad.js). De AI zoekt eventueel meteen de antwoorden.
$('a-blad').addEventListener('click', async () => {
  $('a-blad-error').textContent = '';
  if (!bronnen.length) return ($('a-blad-error').textContent = 'Voeg eerst je toets toe (pdf, scan of foto).');
  $('a-blad').disabled = true;
  const busy = t => { $('a-blad-busy').textContent = t; };
  try {
    const bladen = await PfEdit.bladenUit(bronnen, busy);
    const n = bladen.reduce((s, b) => s + b.velden.length, 0);
    if (hasKey && $('a-blad-ai').checked && n) {
      busy(`${Ui.ai} zoekt de antwoorden voor ${n} vakjes… dit duurt meestal 20 tot 60 seconden.`);
      try {
        PfBlad.zetSleutel(bladen, await aiSleutel(bladen));
      } catch (err) {
        Ui.melding(`De bladen staan klaar, maar de antwoorden zoeken lukte niet: ${err.message} Vul ze zelf in, of probeer het opnieuw per blad.`);
      }
    }
    const titel = $('a-topic').value.trim() || bronnen[0].naam.replace(/\.[a-z]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 100);
    openEditor(metDoel({ title: titel, vragen: bladen }), null);
  } catch (err) {
    $('a-blad-error').textContent = err.message;
  }
  busy('');
  $('a-blad').disabled = false;
});

// ---------- Bewerken ----------
// Elke vraag is een kaart. Afbeeldingen zitten op de kaart zelf (card.pfBeeld), net als de juiste plekken bij aanduiden.

let editingFile = null;
let editNiveau = 'schildknaap';
const vragenBox = n => $(n === 'schildknaap' ? 'e-vragen' : `e-vragen-${n}`);

// De AI zoekt de antwoorden voor de vakjes op de bladen (met de eigen sleutel). Per 8 bladen één vraag.
async function aiSleutel(bladen) {
  const alles = [];
  for (let i = 0; i < bladen.length; i += 8) {
    const deel = bladen.slice(i, i + 8);
    const start = 1 + bladen.slice(0, i).reduce((s, b) => s + b.velden.length, 0);
    let nr = start;
    const files = [];
    for (const b of deel) {
      const g = await PfBlad.genummerd(b, nr);
      files.push({ mimeType: g.mimeType, data: g.data });
      nr += b.velden.length;
    }
    const res = await new Promise(resolve => socket.emit('pf-sleutel', { prompt: PfBlad.aiPrompt(deel, start, $('a-level').value), files }, resolve));
    if (res.error) throw new Error(res.error);
    alles.push(...res.velden);
  }
  return alles;
}

// De verbetersleutel voor alle bladen tegelijk: met de eigen sleutel, of via een chatbot (prompt + genummerde bladen).
const bladKaarten = () => [...vragenBox(editNiveau).querySelectorAll(':scope > .pf-kaart-edit[data-type="blad"]')];
const bladenVan = kaarten => kaarten.map(c => ({ beeld: c.pfBeeld, verhouding: c.pfBlad.verhouding, velden: c.pfBlad.velden.map(f => ({ ...f })) }));
let sleutelWacht = false;
function zetAlleSleutels(raw) {
  const kaarten = bladKaarten();
  const bladen = bladenVan(kaarten);
  try {
    const n = PfBlad.zetSleutel(bladen, raw);
    kaarten.forEach((c, i) => { c.pfBlad.velden = bladen[i].velden; c.pfTeken(); });
    sleutelWacht = false;
    $('s-copy-box').classList.add('hidden');
    $('s-answer').value = '';
    $('s-error').textContent = '';
    $('s-busy').textContent = `${n} antwoorden ingevuld. Kijk ze na: de AI kan zich vergissen.`;
    preview();
  } catch (err) {
    $('s-error').textContent = err.message;
  }
}
$('s-key').addEventListener('click', async () => {
  const kaarten = bladKaarten();
  const bladen = bladenVan(kaarten);
  if (!bladen.some(b => b.velden.length)) return ($('s-error').textContent = 'Zet eerst vakjes op de bladen.');
  $('s-error').textContent = '';
  $('s-key').disabled = true;
  $('s-busy').textContent = `${Ui.ai} zoekt de antwoorden… dit duurt meestal 20 tot 60 seconden.`;
  try {
    zetAlleSleutels(await aiSleutel(bladen));
  } catch (err) {
    $('s-busy').textContent = '';
    $('s-error').textContent = err.message;
  }
  $('s-key').disabled = false;
});
$('s-copy').addEventListener('click', async () => {
  const bladen = bladenVan(bladKaarten());
  if (!bladen.some(b => b.velden.length)) return ($('s-error').textContent = 'Zet eerst vakjes op de bladen.');
  $('s-error').textContent = '';
  await kopieer(PfBlad.aiPrompt(bladen, 1, $('a-level').value));
  let nr = 1;
  for (const [i, b] of bladen.entries()) {
    const g = await PfBlad.genummerd(b, nr);
    nr += b.velden.length;
    PfBlad.download(g.url, `blad-${i + 1}-vakjes.jpg`);
  }
  sleutelWacht = true;
  $('s-copy-box').classList.remove('hidden');
});
$('s-answer').addEventListener('paste', () => setTimeout(() => zetAlleSleutels($('s-answer').value), 0));

function leesLijst(box) {
  return [...box.children].map(leesKaart);
}

function readEditor() {
  const t = { title: $('e-title').value, intro: $('e-intro').value, vragen: leesLijst($('e-vragen')) };
  for (const n of ['page', 'ridder']) {
    const l = leesLijst(vragenBox(n));
    if (l.length) t[n] = l;
  }
  return t;
}

function showNiveau(n) {
  editNiveau = n;
  for (const l of Niveau.LIST) vragenBox(l).classList.toggle('hidden', l !== n);
  renderNiveauTabs();
  preview();
}

function renderNiveauTabs() {
  for (const b of $('e-niveaus').querySelectorAll('button')) {
    const n = b.dataset.niveau;
    const count = vragenBox(n).children.length;
    b.classList.toggle('on', n === editNiveau);
    b.textContent = `${Niveau.label(n)} · ${Niveau.HELP[n]}${n === 'schildknaap' || count ? ` (${count})` : ''}`;
  }
  const help = $('e-niveau-help');
  help.innerHTML = '';
  if (editNiveau === 'schildknaap') help.textContent = 'De gewone toets. Page (met hulp) en Ridder (uitdaging) zijn extra versies; laat ze leeg als je ze niet nodig hebt.';
  else if (!vragenBox(editNiveau).children.length) {
    help.append(`Nog leeg: wie op ${Niveau.NAMES[editNiveau]} staat, krijgt de Schildknaap-toets. `);
    const copy = document.createElement('button');
    copy.className = 'secondary small-btn';
    copy.textContent = 'Begin met een kopie van Schildknaap';
    copy.addEventListener('click', () => {
      for (const q of leesLijst($('e-vragen'))) vragenBox(editNiveau).appendChild(vraagKaart(q));
      renderNiveauTabs();
      preview();
    });
    help.appendChild(copy);
  } else help.textContent = editNiveau === 'page' ? 'Page: dezelfde leerstof met hulp.' : 'Ridder: dezelfde leerstof, moeilijker of een stap verder.';
}
for (const b of $('e-niveaus').querySelectorAll('button')) b.addEventListener('click', () => showNiveau(b.dataset.niveau));

// Nummers op de kaarten, zoals op de toets: 1, 2, 3a, 3b.
function nummer() {
  for (const n of Niveau.LIST) {
    [...vragenBox(n).children].forEach((card, i) => {
      card.querySelector('.pf-k-nr').textContent = `${i + 1}.`;
      for (const [j, d] of [...card.querySelectorAll(':scope > .pf-k-body > .pf-deelvragen > .pf-kaart-edit')].entries()) d.querySelector('.pf-k-nr').textContent = `${i + 1}${'abcdefghijklmno'[j]}.`;
    });
  }
}

// Het voorbeeld rechts, met de verbetersleutel. Meteen in de browser gecontroleerd (PfKern), zonder de server.
let previewTimer = null;
function preview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    nummer();
    renderNiveauTabs();
    // Is een vraag nog niet af, dan toont het voorbeeld de vragen die wel af zijn, met erboven wat er nog ontbreekt.
    const ruw = readEditor();
    let t = null;
    let fout = '';
    try {
      t = PfKern.validate(ruw);
    } catch (err) {
      fout = err.message;
      const af = l => (l || []).filter(q => { try { PfKern.validate({ title: 'Toets', vragen: [q] }); return true; } catch { return false; } });
      const deel = { ...ruw, title: ruw.title.trim() || 'Toets', vragen: af(ruw.vragen) };
      for (const n of ['page', 'ridder']) { if (ruw[n]) { const l = af(ruw[n]); if (l.length) deel[n] = l; else delete deel[n]; } }
      try { if (deel.vragen.length) t = PfKern.validate(deel); } catch { t = null; }
    }
    $('e-error').textContent = fout;
    const melding = fout ? `<p class="pf-voorbeeld-fout">⚠️ ${fout.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</p>` : '';
    if (!t) { $('e-preview').innerHTML = melding; return; }
    const lijst = PfKern.lijstVoor(t, editNiveau);
    const v = PfKern.studentView(t, lijst);
    const sleutel = {};
    const zones = {};
    for (const { id, q } of PfKern.vragenVan(lijst)) {
      sleutel[id] = q.type === 'blad' ? PfKern.veldSleutel(q) : PfKern.oplossing(q);
      if (q.type === 'aanduiden') zones[id] = q.zones;
    }
    PfPaper.render($('e-preview'), v.pages, { mode: 'view', nummer: true, sleutel, zones });
    if (melding) $('e-preview').insertAdjacentHTML('afterbegin', melding);
    $('e-totaal').textContent = `${PfKern.vragenVan(lijst).length} vragen · ${nl(PfKern.totaal(lijst))} punten${PfKern.niveausVan(t).length > 1 ? ` (${Niveau.NAMES[editNiveau]})` : ''}`;
    $('s-panel').classList.toggle('hidden', !bladKaarten().length);
    $('s-key').classList.toggle('hidden', !hasKey);
    const pr = PfKern.problemen(t);
    const tips = PfKern.waarschuwingen(t);
    $('e-problemen').classList.toggle('hidden', !pr.length && !tips.length);
    $('e-problemen').innerHTML = (pr.length ? `<strong>Nog te doen voor je de toets afneemt:</strong><ul>${pr.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '')
      + (tips.length ? `<strong>Tip:</strong><ul>${tips.map(p => `<li>${esc(p)}: knip ze uit je pdf met ✂ of voeg een afbeelding toe.</li>`).join('')}</ul>` : '');
  }, 250);
}

function openEditor(t, file) {
  editingFile = file;
  $('e-heading').textContent = file ? 'Toets bewerken' : 'Nieuwe toets';
  $('e-title').value = t.title || '';
  $('e-intro').value = t.intro || '';
  for (const n of Niveau.LIST) {
    vragenBox(n).innerHTML = '';
    for (const q of (n === 'schildknaap' ? t.vragen : t[n]) || []) vragenBox(n).appendChild(vraagKaart(q));
  }
  $('e-error').textContent = '';
  $('b-error').textContent = '';
  $('b-answer-label').classList.add('hidden');
  show('editor');
  showNiveau('schildknaap');
}

// Vraag toevoegen: in groepjes, met een icoon en een zinnetje, zodat je meteen ziet wat elke soort doet.
const ADD_GROEPEN = [
  ['Kiezen', [['meerkeuze', 'Eén of meer juiste keuzes'], ['juistfout', 'Juist of fout'], ['verbinden', 'Wat hoort bij elkaar?'], ['ordenen', 'In de juiste volgorde']]],
  ['Typen', [['invullen', 'Gaten of keuzelijstjes in een tekst'], ['kort', 'Een woord of getal'], ['rekenen', 'Bewerking en uitkomst'], ['tabel', 'Cellen in een tabel']]],
  ['Aanduiden', [['aanduiden', 'Een plek op een afbeelding'], ['getallenas', 'Een getal op de getallenas'], ['markeren', 'Woorden in een tekst']]],
  ['Maken', [['tekenen', 'Tekenen, op een afbeelding of leeg'], ['spreken', 'Een antwoord inspreken'], ['open', 'Een open vraag'], ['papier', 'Een opdracht op papier']]],
  ['Meer', [['bron', 'Een tekst of prent met deelvragen']]],
];
PfEdit.palet($('e-add'), ADD_GROEPEN, {
  onKies: t => {
    const card = vraagKaart(PfEdit.nieuw(t));
    vragenBox(editNiveau).appendChild(card);
    const f = card.querySelector('textarea, input');
    if (f) f.focus();
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    preview();
  },
  onBladen: bladen => {
    for (const q of bladen) vragenBox(editNiveau).appendChild(vraagKaart(q));
    preview();
  },
});
$('editor').addEventListener('input', e => { if (e.target.closest('.pf-vragen') || ['e-title', 'e-intro'].includes(e.target.id)) preview(); });
$('editor').addEventListener('change', e => { if (e.target.closest('.pf-vragen')) preview(); });

$('new-empty').addEventListener('click', () => {
  openEditor({ title: '', vragen: [] }, null);
  $('e-title').focus();
});
// De vier manieren om te beginnen op het startscherm van De Proef.
for (const k of document.querySelectorAll('#pf-start [data-start]')) {
  k.addEventListener('click', () => {
    const w = k.dataset.start;
    if (w === 'leeg') return $('new-empty').click();
    if (w === 'bewerk') return $('toets-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelector(`input[name="a-modus"][value="${w}"]`).checked = true;
    $('a-modus').dispatchEvent(new Event('change', { bubbles: true }));
    $('new-ai').click();
  });
}

function save(then, fail) {
  socket.emit('pf-save', { toets: readEditor(), file: editingFile }, res => {
    if (res.error) {
      $('e-error').textContent = res.error;
      if (fail) fail();
      return;
    }
    editingFile = res.file;
    then(res.file);
  });
}
$('e-save').addEventListener('click', () => save(() => show('list')));
$('e-live').addEventListener('click', () => save(file => afnemen(file)));
$('e-print').addEventListener('click', () => {
  const tab = window.open('', '_blank');
  const keyTab = window.open('', '_blank');
  save(file => {
    const url = `/proef-print?file=${encodeURIComponent(file)}`;
    if (tab) tab.location = url;
    if (keyTab) keyTab.location = `${url}&sleutel=1`;
  }, () => { if (tab) tab.close(); if (keyTab) keyTab.close(); });
});

// ---------- Bijsturen met AI ----------
// De hele toets gaat mee als JSON. Afbeeldingen worden "#beeld1", "#beeld2"... (zo blijft de prompt klein) en komen daarna terug.
let beeldTabel = [];
function zonderBeelden(t) {
  beeldTabel = [];
  const vervang = v => {
    if (typeof v !== 'string' || !v.startsWith('data:')) return v;
    let i = beeldTabel.indexOf(v);
    if (i < 0) i = beeldTabel.push(v) - 1;
    return `#beeld${i + 1}`;
  };
  return JSON.parse(JSON.stringify(t, (k, v) => (k === 'beeld' ? vervang(v) : v)));
}
function metBeelden(t) {
  return JSON.parse(JSON.stringify(t, (k, v) => (k === 'beeld' && typeof v === 'string' && /^#beeld\d+$/.test(v) ? beeldTabel[Number(v.slice(6)) - 1] || undefined : v)));
}

function bijstuurPrompt() {
  const opdracht = $('b-opdracht').value.trim();
  if (!opdracht) throw new Error('Typ eerst wat er anders moet.');
  let t;
  try { t = PfKern.validate(readEditor()); } catch (err) { throw new Error(`Los eerst dit op: ${err.message}`); }
  const json = JSON.stringify(zonderBeelden(t), null, 1);
  return `Je bent een ervaren leerkracht in Vlaanderen. Hieronder staat een toets in JSON (de vorm die LANcelot gebruikt). Pas hem aan volgens deze opdracht van de leerkracht:
"${opdracht}"

Regels:
- Verander alleen wat de opdracht vraagt. Laat de rest precies zoals het is.
- Waarden zoals "#beeld1" zijn afbeeldingen: laat ze ongewijzigd bij de vraag waar ze horen.
- Gebruik dezelfde vorm en soorten vragen (meerkeuze, juistfout, invullen, kort, rekenen, verbinden, ordenen, tabel, aanduiden, open, papier, bron). "juist" bij meerkeuze telt vanaf 0.
- Vraagt de opdracht om drie niveaus, zet dan de vragen in "vragen" (Schildknaap, het doel), "page" (met hulp) en "ridder" (uitdaging).
- Gebruik de Belgische schrijfwijze: komma als decimaalteken.
- Maak GEEN app of interactieve quiz en schrijf geen code. Geef de volledige aangepaste toets als één codeblok met JSON (\`\`\`json … \`\`\`), zonder uitleg.

De toets:
\`\`\`json
${json}
\`\`\``;
}

function bijgestuurd(raw, quiet) {
  const ok = t => {
    $('b-error').textContent = '';
    $('b-answer').value = '';
    $('b-answer-label').classList.add('hidden');
    $('b-busy').textContent = '';
    openEditor(metBeelden(t), editingFile);
    Ui.melding('De toets is aangepast. Kijk hem na en sla hem op.');
  };
  if (typeof raw === 'object') return ok(raw);
  socket.emit('pf-parse', raw, res => {
    if (res.error) { if (!quiet) $('b-error').textContent = res.error; return; }
    ok(res.toets);
  });
}

$('b-key').addEventListener('click', () => {
  let prompt;
  try { prompt = bijstuurPrompt(); } catch (err) { return ($('b-error').textContent = err.message); }
  $('b-error').textContent = '';
  $('b-key').disabled = true;
  $('b-busy').textContent = `${Ui.ai} past de toets aan… dit duurt meestal 20 tot 60 seconden.`;
  socket.emit('pf-generate', { prompt, files: [], lang: true }, res => {
    $('b-key').disabled = false;
    $('b-busy').textContent = '';
    if (res.error) return ($('b-error').textContent = res.error);
    bijgestuurd(res.toets);
  });
});
$('b-copy').addEventListener('click', async () => {
  let prompt;
  try { prompt = bijstuurPrompt(); } catch (err) { return ($('b-error').textContent = err.message); }
  $('b-error').textContent = '';
  await kopieer(prompt, null);
  $('b-busy').textContent = 'Gekopieerd! Plak de prompt in een chatbot, kopieer het antwoord en kom hier terug.';
  $('b-answer-label').classList.remove('hidden');
});
$('b-answer').addEventListener('paste', () => setTimeout(() => bijgestuurd($('b-answer').value, false), 0));

// ---------- Afnemen ----------

const STATUS = { wacht: ['⏳', 'nog niet begonnen'], kiest: ['…', 'kiest niveau'], bezig: ['✍️', 'bezig'], weg: ['⚠️', 'verliet de toets'], slot: ['🔒', 'op slot'], klaar: ['✔', 'ingeleverd'] };
const SOORT = { tab: 'ander tabblad of venster', scherm: 'volledig scherm verlaten', herladen: 'pagina herladen', plak: 'probeerde te plakken' };

socket.on('pf-toets', t => { hostToets = t; });
socket.on('pf-state', s => {
  const prev = state;
  state = s;
  $('stop').classList.toggle('hidden', !s.active);
  $('status').textContent = s.active ? `Toets · ${s.title}` : 'De Proef';
  if (!s.active) {
    if (view === 'lobby') show('list');
    return;
  }
  if (!hostToets || hostToets.run !== s.run) socket.emit('pf-toets', null, t => { hostToets = t; });
  if (view !== 'lobby' && view !== 'verbeter') show('lobby');
  renderLive(prev);
});

socket.on('pf-alarm', a => {
  sfx.bad && sfx.bad();
  const n = $('l-uitleg');
  n.textContent = `⚠️ ${a.name}: ${a.soort}${a.slot ? ' (op slot)' : ''}`;
  n.classList.add('pf-alarm');
  clearTimeout(n.timer);
  n.timer = setTimeout(() => { n.classList.remove('pf-alarm'); renderUitleg(); }, 8000);
});

function tijd(ms) {
  const m = Math.floor(ms / 60000);
  return `${m}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
}

function renderUitleg() {
  if ($('l-uitleg').classList.contains('pf-alarm') || !state) return;
  const i = state.inst;
  $('l-uitleg').textContent = [
    i.tijd ? `${i.tijd} minuten` : 'geen tijdslimiet',
    i.scherm ? 'volledig scherm' : 'zonder volledig scherm',
    i.schudden ? 'vragen door elkaar' : 'vaste volgorde',
    i.terug ? 'terugkeren mag' : 'niet terug',
    i.slot === 'slot' ? 'verlaten = op slot' : 'verlaten = melding',
  ].join(' · ') + '. Klik op een naam om mee te kijken.';
}

function renderLive(prev) {
  const s = state;
  $('l-title').textContent = s.title;
  const r = s.ranking;
  const n = st => r.filter(p => p.status === st).length;
  $('l-summary').textContent = `${r.length} ${r.length === 1 ? 'leerling' : 'leerlingen'} · ${n('bezig') + n('weg') + n('slot')} bezig · ${n('klaar')} ingeleverd${n('slot') ? ` · 🔒 ${n('slot')} op slot` : ''}`;
  $('l-vrij').classList.toggle('hidden', !n('slot'));
  $('l-extra').classList.toggle('hidden', !s.inst.tijd || s.phase !== 'open');
  $('l-uitslag').textContent = `Leerlingen zien hun punten: ${s.inst.uitslag ? 'aan' : 'uit'}`;
  $('l-finish').classList.toggle('hidden', s.phase !== 'open');
  renderUitleg();
  const box = $('l-students');
  if (!r.length) box.innerHTML = '<p class="muted">Nog niemand. Laat de leerlingen naar het adres surfen; wie op het startscherm staat, komt vanzelf in de toets.</p>';
  else {
    box.innerHTML = r.map(p => {
      const [ic, label] = STATUS[p.status] || ['', p.status];
      const lvl = s.multi ? ` <span class="ob-niveau-tag ${p.niveau}">${Niveau.label(p.niveau)}</span>` : '';
      return `<div class="pf-lln ${p.status}${p.online ? '' : ' offline'}" data-id="${esc(p.id)}" role="button" tabindex="0">
        <span class="n">${esc(p.name)}${lvl}</span>
        <span class="st">${ic} ${label}${p.online ? '' : ' · geen verbinding'}</span>
        <span class="bar"><i style="width:${p.vragen ? (p.gedaan / p.vragen) * 100 : 0}%"></i></span>
        <span class="info">${p.gedaan}/${p.vragen} ingevuld${p.status === 'bezig' || p.status === 'weg' || p.status === 'slot' ? ` · vraag ${p.pos}` : ''}${p.rest !== null ? ` · ⏳ ${tijd(p.rest)}` : ''}${p.extra ? ` · +${p.extra} min` : ''}</span>
        ${p.weg ? `<span class="weg" title="${esc(SOORT[p.laatste] || '')}">⚠ ${p.weg}× verlaten</span>` : ''}
        ${p.status === 'slot' ? '<button class="gold small-btn vrij">🔓 Vrijgeven</button>' : ''}
      </div>`;
    }).join('');
    for (const el of box.querySelectorAll('.pf-lln')) {
      el.addEventListener('click', e => {
        if (e.target.closest('.vrij')) return socket.emit('pf-vrij', { id: el.dataset.id });
        openDetail(el.dataset.id);
      });
    }
    if (prev && prev.ranking && r.length > prev.ranking.length) sfx.join();
  }
  const einde = s.phase === 'einde';
  $('l-einde').classList.toggle('hidden', !einde);
  if (einde) $('l-einde-tekst').textContent = s.afname ? 'De antwoorden staan klaar om te verbeteren.' : 'Niemand was begonnen, dus er is niets te verbeteren.';
  $('l-verbeter').classList.toggle('hidden', !s.afname);
  if (detailId) openDetail(detailId, true);
}

// Elke seconde de resterende tijd op de kaarten laten aftellen, zonder te wachten op de server.
setInterval(() => {
  if (view !== 'lobby' || !state || !state.inst || !state.inst.tijd) return;
  for (const p of state.ranking) if (p.rest !== null && p.status !== 'klaar') p.rest = Math.max(0, p.rest - 1000);
  for (const el of $('l-students').querySelectorAll('.pf-lln')) {
    const p = state.ranking.find(x => x.id === el.dataset.id);
    const info = el.querySelector('.info');
    if (p && info && p.rest !== null) info.textContent = info.textContent.replace(/⏳ \d+:\d\d/, `⏳ ${tijd(p.rest)}`);
  }
}, 1000);

// De toets zoals in de toets zelf (niet geschud), met de antwoorden van één leerling.
function papierVan(toets, niveau, answers, punten) {
  const lijst = PfKern.lijstVoor(toets, niveau);
  const v = PfKern.studentView(toets, lijst);
  const sleutel = {};
  const zones = {};
  for (const { id, q } of PfKern.vragenVan(lijst)) {
    sleutel[id] = q.type === 'blad' ? PfKern.veldSleutel(q) : PfKern.oplossing(q);
    if (q.type === 'aanduiden') zones[id] = q.zones;
  }
  return { pages: v.pages, opts: { mode: 'view', nummer: true, answers: answers || {}, sleutel, zones, punten } };
}

let detailId = null;
function openDetail(id, refresh) {
  socket.emit('pf-detail', { id }, res => {
    if (!res || res.error || !hostToets) return;
    detailId = id;
    $('d-name').textContent = `${res.name} · ${(STATUS[res.status] || [])[1] || ''}`;
    const knoppen = [];
    if (res.status === 'slot') knoppen.push('<button class="gold" data-a="vrij">🔓 Vrijgeven</button>');
    if (state.inst.tijd && res.status !== 'klaar') knoppen.push('<button class="secondary" data-a="extra">+5 min</button>');
    if (res.status === 'klaar' && state.phase === 'open') knoppen.push('<button class="secondary" data-a="heropen">🔓 Heropen</button>');
    if (state.multi && (res.status === 'wacht' || res.status === 'kiest')) for (const n of state.niveaus) knoppen.push(`<button class="secondary${n === res.niveau ? ' on' : ''}" data-a="niveau" data-n="${n}">${Niveau.label(n)}</button>`);
    knoppen.push('<button class="secondary" data-a="weg" title="Uit de toets halen">Verwijderen</button><button class="secondary" data-a="sluit">Sluiten</button>');
    $('d-actions').innerHTML = knoppen.join('');
    for (const b of $('d-actions').querySelectorAll('button')) {
      b.addEventListener('click', async () => {
        const a = b.dataset.a;
        if (a === 'sluit') return sluitDetail();
        if (a === 'vrij') socket.emit('pf-vrij', { id });
        if (a === 'extra') socket.emit('pf-extra', { id, minuten: 5 });
        if (a === 'heropen') socket.emit('pf-heropen', { id });
        if (a === 'niveau') socket.emit('pf-zet-niveau', { id, niveau: b.dataset.n }, r => { if (r && r.error) Ui.melding(r.error); });
        if (a === 'weg') {
          if (!await Ui.vraag(`${res.name} uit de toets halen? Wat al ingevuld is, gaat verloren.`, { gevaar: true })) return;
          socket.emit('pf-kick', id);
          return sluitDetail();
        }
        setTimeout(() => openDetail(id, true), 300);
      });
    }
    $('d-events').innerHTML = res.events.length
      ? `<strong>⚠ Verliet de toets ${res.events.length}×:</strong> ${res.events.map(e => `${tijd(e.t)} ${esc(e.soort)}${e.ms ? ` (${Math.round(e.ms / 1000)} s weg)` : ''}`).join(' · ')}`
      : '<span class="muted">Bleef de hele tijd in de toets.</span>';
    const punten = {};
    for (const { id: qid, q } of PfKern.vragenVan(PfKern.lijstVoor(hostToets.toets, res.niveau))) {
      const auto = Number(res.auto[qid]) || 0;
      punten[qid] = [PfKern.handPunten(q) ? `${nl(auto)} + ?` : auto, PfKern.maxVan(q)];
    }
    const { pages, opts } = papierVan(hostToets.toets, res.niveau, res.answers, punten);
    const scroll = $('detail').querySelector('.ob-modal-box').scrollTop;
    PfPaper.render($('d-paper'), pages, opts);
    $('detail').classList.remove('hidden');
    if (refresh) $('detail').querySelector('.ob-modal-box').scrollTop = scroll;
  });
}
function sluitDetail() {
  detailId = null;
  $('detail').classList.add('hidden');
}
$('detail').addEventListener('click', e => { if (e.target.id === 'detail') sluitDetail(); });

$('l-vrij').addEventListener('click', () => socket.emit('pf-vrij', {}));
$('l-extra').addEventListener('click', () => socket.emit('pf-extra', { minuten: 5 }));
$('l-uitslag').addEventListener('click', () => socket.emit('pf-uitslag', { aan: !state.inst.uitslag }));
$('l-finish').addEventListener('click', async () => {
  const bezig = state.ranking.filter(p => p.status !== 'klaar' && p.status !== 'wacht').length;
  if (await Ui.vraag(`De toets afsluiten?${bezig ? ` ${bezig} ${bezig === 1 ? 'leerling is' : 'leerlingen zijn'} nog bezig en ${bezig === 1 ? 'levert' : 'leveren'} automatisch in.` : ''}`)) socket.emit('pf-finish');
});
$('l-verbeter').addEventListener('click', () => { if (state && state.afname) openAfname(state.afname); });
$('l-sluit').addEventListener('click', () => stopToets());
$('stop').addEventListener('click', async () => {
  if (state && state.phase === 'open' && !await Ui.vraag('De toets sluiten? Wie bezig is, levert automatisch in.')) return;
  stopToets();
});
function stopToets() {
  socket.emit('pf-stop', null, res => {
    const note = $('stopped');
    note.textContent = res && res.afname ? 'De toets is gesloten. Je vindt hem onderaan bij Afgenomen toetsen om verder te verbeteren.' : 'De toets is gesloten.';
    note.classList.remove('hidden');
    if (view === 'lobby') show('list');
  });
}

// ---------- Verbeteren ----------

let afname = null;
function openAfname(file) {
  socket.emit('pf-afname', file, res => {
    if (res.error) return Ui.melding(res.error);
    afname = res.afname;
    show('verbeter');
    renderAfname();
  });
}
$('v-terug').addEventListener('click', () => show(state && state.active ? 'lobby' : 'list'));
for (const b of $('v-tabs').querySelectorAll('button')) {
  b.addEventListener('click', () => {
    for (const x of $('v-tabs').querySelectorAll('button')) {
      x.classList.toggle('on', x === b);
      $(`v-${x.dataset.tab}`).classList.toggle('hidden', x !== b);
    }
  });
}

// De punten die een vraag echt oplevert: wat jij zelf gaf (over), anders computer + jouw punten.
const zelfGegeven = (s, id) => s.over && s.over[id] !== undefined && s.over[id] !== null;
function kreeg(s, id) {
  if (zelfGegeven(s, id)) return Number(s.over[id]);
  return (Number(s.auto[id]) || 0) + (Number(s.hand[id]) || 0);
}

function standVan(s) {
  let punten = 0;
  let max = 0;
  let open = 0;
  for (const { id, q } of PfKern.vragenVan(PfKern.lijstVoor(afname.toets, s.niveau))) {
    max += PfKern.maxVan(q);
    if (zelfGegeven(s, id)) { punten += Number(s.over[id]); continue; }
    punten += Number(s.auto[id]) || 0;
    if (PfKern.handPunten(q)) {
      if (s.hand[id] === undefined || s.hand[id] === null) open++;
      else punten += Number(s.hand[id]);
    }
  }
  return { punten, max, open };
}

function antwoordTekst(q, a) {
  if (a === undefined || a === null || a === '') return '<em class="muted">niet ingevuld</em>';
  if (q.type === 'rekenen') return `<div class="pf-werk-antw">${esc(a.werk || '').replace(/\n/g, '<br>') || '<em class="muted">geen bewerking</em>'}</div><p>Uitkomst: <strong>${esc(a.uitkomst || '–')}</strong> ${q.eenheid && !String(a.uitkomst || '').includes(q.eenheid) ? esc(q.eenheid) : ''}</p>`;
  if (q.type === 'tekenen') return `<div class="pf-teken-wrap klein" style="aspect-ratio:${1 / (q.verhouding || 0.6)}">${q.beeld ? `<img src="${esc(q.beeld)}" alt="">` : ''}<img class="pf-tekening" src="${esc(a)}" alt="Tekening"></div>`;
  if (q.type === 'spreken') return `<audio controls preload="none" src="${esc(a)}"></audio>`;
  if (q.type === 'blad') {
    const rijen = q.velden.map((f, k) => (f.soort === 'open' ? `<p><b>Vak ${k + 1}:</b> ${a[k] ? esc(a[k]).replace(/\n/g, '<br>') : '<em class="muted">leeg</em>'}</p>`
      : f.soort === 'teken' ? `<p><b>Vak ${k + 1}:</b> ${a[k] ? `<img class="pf-vak-tekening" src="${esc(a[k])}" alt="Tekening">` : '<em class="muted">leeg</em>'}</p>` : '')).join('');
    return rijen || esc(antwoordKort(q, a));
  }
  if (typeof a === 'object') return esc(antwoordKort(q, a));
  return esc(String(a)).replace(/\n/g, '<br>');
}

// Een antwoord kort als tekst (voor de lijst en de foutenanalyse), in de volgorde van de toets zelf.
function antwoordKort(q, a) {
  const L = 'ABCDEFGH';
  if (a === undefined || a === null || a === '' || (Array.isArray(a) && !a.some(x => x !== null && x !== undefined && x !== ''))) return '';
  const opt = i => (typeof q.opties[i] === 'string' ? q.opties[i] : (q.opties[i] && q.opties[i].tekst) || '');
  if (q.type === 'meerkeuze') return [].concat(a).map(i => `${L[i]}${opt(i) ? ` (${opt(i)})` : ''}`).join(' + ');
  if (q.type === 'juistfout') return a === 'J' ? 'Juist' : 'Fout';
  if (q.type === 'rekenen') return String(a.uitkomst || '');
  if (q.type === 'invullen' || q.type === 'tabel') return a.map(x => x || '…').join(' · ');
  if (q.type === 'verbinden') return q.paren.map((p, k) => `${p[0]} = ${a[k] === null || a[k] === undefined ? '…' : q.paren[a[k]][1]}`).join(' · ');
  if (q.type === 'ordenen') return a.map(i => q.items[i]).join(' → ');
  if (q.type === 'aanduiden') return 'een plek op de afbeelding';
  if (q.type === 'getallenas') return PfKern.asTekst(Number(a), q.breuk);
  if (q.type === 'markeren') { const w = PfKern.woordenVan(q.tekst); return a.map(i => (w.find(x => x.w === i) || {}).t || '?').join(' · '); }
  if (q.type === 'tekenen') return 'een tekening';
  if (q.type === 'spreken') return 'een opname';
  if (q.type === 'blad') return q.velden.map((f, k) => (a[k] === true ? `${k + 1}: ✗` : f.soort === 'teken' && a[k] ? `${k + 1}: tekening` : a[k] ? `${k + 1}: ${a[k]}` : '')).filter(Boolean).join(' · ');
  return String(a).slice(0, 200);
}

let alleVragen = false;
function renderAfname() {
  const a = afname;
  $('v-title').textContent = `Verbeteren · ${a.title}`;
  const totOpen = a.spelers.reduce((n, s) => n + standVan(s).open, 0);
  $('v-info').textContent = `${new Date(a.datum).toLocaleString('nl-BE', { dateStyle: 'medium', timeStyle: 'short' })} · ${a.spelers.length} leerlingen · ${totOpen ? `nog ${totOpen} antwoorden te verbeteren` : 'alles verbeterd'}`;
  const note = $('v-klaar-note');
  note.innerHTML = '';
  if (a.klaar && a.resultaten) {
    note.append('Klaar: de punten staan in het logboek en in Excel. Pas je nog iets aan, klik dan op Excel opnieuw maken. ');
    note.append(downloadLink(a.resultaten));
  }
  note.classList.toggle('hidden', !(a.klaar && a.resultaten));
  $('v-klaar').textContent = a.klaar ? 'Excel opnieuw maken' : 'Klaar met verbeteren';

  // Per vraag: wat jij verbetert (open, op papier, de bewerking), of alle vragen om ook de computer te corrigeren.
  const groepen = [];
  for (const n of PfKern.niveausVan(a.toets)) {
    const spelers = a.spelers.map((s, i) => ({ s, i })).filter(x => (PfKern.niveausVan(a.toets).length > 1 ? x.s.niveau === n : true));
    if (!spelers.length) continue;
    for (const { id, q, nr, bron } of PfKern.vragenVan(PfKern.lijstVoor(a.toets, n))) {
      if (alleVragen || PfKern.handPunten(q)) groepen.push({ n, id, q, nr, bron, spelers });
    }
  }
  const multi = PfKern.niveausVan(a.toets).length > 1;
  const filter = `<div class="pf-tabs pf-filter"><button type="button" class="secondary${alleVragen ? '' : ' on'}" data-alle="0">Te verbeteren door jou</button><button type="button" class="secondary${alleVragen ? ' on' : ''}" data-alle="1">Alle vragen (ook ✔ / ✘ van de computer aanpassen)</button></div>`;
  $('v-vragen').innerHTML = filter + (groepen.length ? groepen.map(g => {
    const hand = !alleVragen && PfKern.handPunten(g.q);
    const sleutel = g.q.type === 'blad' ? PfKern.oplossing(g.q) : g.q.model || PfKern.oplossing(g.q);
    return `<div class="panel pf-vg">
      <h3>${multi ? `${Niveau.ICONS[g.n]} ` : ''}Vraag ${esc(g.nr)} · ${esc(PfKern.NAMES[g.q.type])} <span class="muted small">(${hand ? `${nl(PfKern.handPunten(g.q))} ${g.q.type === 'rekenen' ? 'punten voor de bewerking' : 'punten'}` : `${nl(PfKern.maxVan(g.q))} punten`})</span></h3>
      ${g.bron && g.bron.tekst ? `<details class="pf-bron-kort"><summary>Bron: ${esc(g.bron.titel || 'tekst')}</summary><p>${esc(g.bron.tekst).replace(/\n/g, '<br>')}</p></details>` : ''}
      ${g.q.vraag ? `<p class="pf-vg-vraag">${esc(g.q.vraag)}</p>` : ''}
      ${g.q.beeld && !g.q.beeld.startsWith('#') && g.q.type !== 'blad' ? `<img class="pf-beeld klein" src="${g.q.beeld}" alt="">` : ''}
      ${sleutel ? `<p class="pf-sleutel">✔ ${esc(sleutel)}</p>` : ''}
      <div class="pf-vg-lijst">${g.spelers.map(({ s, i }) => `<div class="pf-vg-rij${!hand && zelfGegeven(s, g.id) ? ' zelf' : ''}">
        <span class="naam">${esc(s.naam)}</span>
        <div class="antw">${g.q.type === 'papier' ? '<em class="muted">op papier</em>' : antwoordTekst(g.q, s.antwoorden[g.id])}${!hand && g.q.type === 'blad' ? vakChips(i, g.id, g.q, s) : ''}</div>
        ${hand ? puntKnoppen(i, g.id, PfKern.handPunten(g.q), s.hand[g.id]) : corrKnoppen(i, g.id, g.q, s)}
      </div>`).join('')}</div></div>`;
  }).join('') : '<p class="muted">Niets meer te verbeteren: de computer verbeterde alles. Klik op Alle vragen om een ✔ of ✘ van de computer aan te passen.</p>');
  for (const b of $('v-vragen').querySelectorAll('[data-alle]')) b.addEventListener('click', () => { alleVragen = b.dataset.alle === '1'; renderAfname(); });

  // Per leerling: punten, procent, hoe vaak hij de toets verliet. Klik voor zijn hele toets.
  $('v-leerlingen').innerHTML = `<p class="muted small">Klik op een naam: je ziet de hele toets van die leerling en past bij elke vraag de punten aan.</p><div class="pf-tabel-wrap"><table class="pf-resultaten"><tr><th>Naam</th>${multi ? '<th>Niveau</th>' : ''}<th>Punten</th><th>%</th><th>Nog te verbeteren</th><th>Verliet de toets</th></tr>
    ${a.spelers.map((s, i) => {
      const st = standVan(s);
      return `<tr data-i="${i}"><td><button class="link">${esc(s.naam)}</button></td>${multi ? `<td>${Niveau.label(s.niveau)}</td>` : ''}<td>${nl(st.punten)} / ${nl(st.max)}</td><td>${st.max ? Math.round((st.punten / st.max) * 100) : 0}%</td><td>${st.open || '–'}</td><td>${(s.events || []).length ? `⚠ ${(s.events || []).length}×` : '–'}</td></tr>`;
    }).join('')}</table></div>`;
  for (const tr of $('v-leerlingen').querySelectorAll('tr[data-i]')) tr.querySelector('button').addEventListener('click', () => leerlingAfname(Number(tr.dataset.i)));
  wirePunten($('v-vragen'));
  renderAnalyse();
}

function puntKnoppen(speler, id, max, nu) {
  const stappen = [];
  for (let p = 0; p <= max && stappen.length < 12; p += max > 6 ? 1 : 0.5) stappen.push(p);
  if (stappen[stappen.length - 1] !== max) stappen.push(max);
  return `<div class="pf-punten" data-speler="${speler}" data-id="${esc(id)}">${stappen.map(p => `<button type="button" class="secondary${nu === p ? ' on' : ''}" data-p="${p}">${nl(p)}</button>`).join('')}</div>`;
}

// Per vakje van een blad: wat de leerling schreef, ✔ of ✘. Klik om het om te draaien.
function vakOordeel(s, id, q) {
  const zelf = (s.vak && s.vak[id]) || {};
  return { goed: PfKern.vakGoed(q, s.antwoorden[id], zelf), zelf };
}
function vakChips(speler, id, q, s) {
  const { goed, zelf } = vakOordeel(s, id, q);
  const a = Array.isArray(s.antwoorden[id]) ? s.antwoorden[id] : [];
  return `<div class="pf-vak-chips" data-speler="${speler}" data-id="${esc(id)}">${goed.map((g, k) => (g === null ? '' : `<button type="button" class="secondary ${g ? 'goed' : 'fout'}${zelf[k] !== undefined ? ' zelf' : ''}" data-k="${k}" title="Klik om ${g ? 'fout' : 'goed'} te zetten">${k + 1}: ${esc(a[k] || '…')} ${g ? '✔' : '✘'}</button>`)).join('')}</div>`;
}
function zetVak(speler, id, k, klaar) {
  const s = afname.spelers[speler];
  const q = PfKern.vragenVan(PfKern.lijstVoor(afname.toets, s.niveau)).find(v => v.id === id).q;
  const { goed, zelf } = vakOordeel(s, id, q);
  const computer = PfKern.vakGoed(q, s.antwoorden[id], {})[k];
  // Terugdraaien naar wat de computer vond: dan is er geen eigen oordeel meer nodig.
  const nieuw = !goed[k] === computer ? null : !goed[k];
  socket.emit('pf-cijfer', { file: afname.file, speler, id, vak: k, goed: nieuw }, res => {
    if (res.error) return Ui.melding(res.error);
    s.vak = s.vak || {};
    s.vak[id] = { ...zelf };
    if (nieuw === null) delete s.vak[id][k]; else s.vak[id][k] = nieuw;
    s.auto[id] = PfKern.auto(q, s.antwoorden[id], s.vak[id]);
    if (s.over) delete s.over[id];
    renderAfname();
    if (klaar) klaar();
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest('.pf-vak-chips button');
  if (!b || !afname) return;
  const box = b.closest('.pf-vak-chips');
  zetVak(Number(box.dataset.speler), box.dataset.id, Number(b.dataset.k));
});

// ✔ / ✘ en punten voor een hele vraag, ook als de computer al verbeterde. Jouw keuze telt; ↺ geeft het terug aan de computer.
function corrKnoppen(speler, id, q, s) {
  const max = PfKern.maxVan(q);
  const nu = kreeg(s, id);
  const zelf = zelfGegeven(s, id);
  const open = !zelf && PfKern.handPunten(q) && (s.hand[id] === undefined || s.hand[id] === null);
  const stappen = [];
  if (max > 1) for (let p = max > 6 ? 1 : 0.5; p < max && stappen.length < 10; p += max > 6 ? 1 : 0.5) stappen.push(p);
  const knop = (p, label, cls) => `<button type="button" class="secondary ${cls || ''}${!open && nu === p ? ' on' : ''}" data-p="${p}" title="${nl(p)} van ${nl(max)}">${label}</button>`;
  const computer = open ? 'nog te verbeteren' : zelf ? `jij: ${nl(nu)} / ${nl(max)}` : `${nu >= max ? '✔' : nu > 0 ? '½' : '✘'} computer: ${nl(nu)} / ${nl(max)}`;
  return `<div class="pf-punten pf-corr" data-speler="${speler}" data-id="${esc(id)}" data-over="1">
    <span class="pf-corr-wie">${computer}</span>
    ${knop(0, '✘', 'fout')}${stappen.map(p => knop(p, nl(p))).join('')}${knop(max, `✔ ${nl(max)}`, 'goed')}
    ${zelf ? '<button type="button" class="secondary terug" data-p="terug" title="Terug naar de punten van de computer">↺</button>' : ''}</div>`;
}

function wirePunten(box, na) {
  for (const g of box.querySelectorAll('.pf-punten')) {
    for (const b of g.querySelectorAll('button')) {
      b.addEventListener('click', () => {
        const s = afname.spelers[Number(g.dataset.speler)];
        const over = g.dataset.over === '1';
        const p = b.dataset.p === 'terug' || (!over && b.classList.contains('on')) ? null : Number(b.dataset.p);
        socket.emit('pf-cijfer', { file: afname.file, speler: Number(g.dataset.speler), id: g.dataset.id, punten: p, over }, res => {
          if (res.error) return Ui.melding(res.error);
          if (over) {
            s.over = s.over || {};
            if (p === null) delete s.over[g.dataset.id]; else s.over[g.dataset.id] = p;
            renderAfname();
            if (na) na();
            return;
          }
          s.hand[g.dataset.id] = p;
          for (const x of g.querySelectorAll('button')) x.classList.toggle('on', p !== null && Number(x.dataset.p) === p);
          const totOpen = afname.spelers.reduce((n, sp) => n + standVan(sp).open, 0);
          $('v-info').textContent = $('v-info').textContent.replace(/·[^·]*$/, `· ${totOpen ? `nog ${totOpen} antwoorden te verbeteren` : 'alles verbeterd'}`);
          renderAnalyse();
          if (na) na();
        });
      });
    }
  }
}

function leerlingAfname(i) {
  const s = afname.spelers[i];
  const punten = {};
  const vragen = PfKern.vragenVan(PfKern.lijstVoor(afname.toets, s.niveau));
  for (const { id, q } of vragen) {
    const open = !zelfGegeven(s, id) && PfKern.handPunten(q) && (s.hand[id] === null || s.hand[id] === undefined);
    punten[id] = [open ? `${nl(Number(s.auto[id]) || 0)} + ?` : kreeg(s, id), PfKern.maxVan(q)];
  }
  const { pages, opts } = papierVan(afname.toets, s.niveau, s.antwoorden, punten);
  opts.vakken = {};
  for (const { id, q } of vragen) if (q.type === 'blad') opts.vakken[id] = vakOordeel(s, id, q);
  const st = standVan(s);
  $('d-name').textContent = `${s.naam} · ${nl(st.punten)} / ${nl(st.max)}`;
  $('d-actions').innerHTML = `${i > 0 ? '<button class="secondary" data-a="vorige">◀ Vorige leerling</button>' : ''}${i < afname.spelers.length - 1 ? '<button class="secondary" data-a="volgende">Volgende leerling ▶</button>' : ''}<button class="secondary" data-a="sluit">Sluiten</button>`;
  for (const b of $('d-actions').querySelectorAll('button')) {
    b.addEventListener('click', () => {
      if (b.dataset.a === 'sluit') return sluitDetail();
      leerlingAfname(i + (b.dataset.a === 'volgende' ? 1 : -1));
    });
  }
  $('d-events').innerHTML = (s.events || []).length
    ? `<strong>⚠ Verliet de toets ${s.events.length}×:</strong> ${s.events.map(e => `${tijd(e.t)} ${esc(SOORT[e.soort] || e.soort)}${e.ms ? ` (${Math.round(e.ms / 1000)} s weg)` : ''}`).join(' · ')}`
    : '<span class="muted">Bleef de hele tijd in de toets.</span>';
  const scroll = $('detail').classList.contains('hidden') ? 0 : $('detail').querySelector('.ob-modal-box').scrollTop;
  PfPaper.render($('d-paper'), pages, opts);
  // Onder elke vraag: ✔ / ✘ of punten, ook waar de computer al verbeterde.
  for (const { id, q } of vragen) {
    const el = $('d-paper').querySelector(`.pf-q[data-id="${id}"]`);
    if (el) el.insertAdjacentHTML('beforeend', corrKnoppen(i, id, q, s));
  }
  wirePunten($('d-paper'), () => leerlingAfname(i));
  for (const b of $('d-paper').querySelectorAll('.pf-vak-oordeel')) b.addEventListener('click', () => zetVak(i, b.dataset.id, Number(b.dataset.k), () => leerlingAfname(i)));
  $('detail').classList.remove('hidden');
  $('detail').querySelector('.ob-modal-box').scrollTop = scroll;
}

// Foutenanalyse: per vraag (en per vakje op een blad) hoeveel procent het juist had en welke foute antwoorden het vaakst voorkwamen.
function renderAnalyse() {
  const a = afname;
  const multi = PfKern.niveausVan(a.toets).length > 1;
  const blokken = [];
  for (const n of PfKern.niveausVan(a.toets)) {
    const spelers = a.spelers.filter(s => (multi ? s.niveau === n : true));
    if (!spelers.length) continue;
    const items = [];
    for (const { id, q, nr } of PfKern.vragenVan(PfKern.lijstVoor(a.toets, n))) {
      const max = PfKern.maxVan(q);
      if (!max) continue;
      if (q.type === 'blad') {
        q.velden.forEach((f, k) => {
          if (!PfKern.AUTO_VELD.has(f.soort)) return;
          const fout = new Map();
          let juist = 0;
          let leeg = 0;
          for (const s of spelers) {
            const x = (s.antwoorden[id] || [])[k];
            if (x === undefined || x === null || x === '') { leeg++; continue; }
            const ok = PfKern.vakGoed(q, s.antwoorden[id] || [])[k];
            if (ok) juist++; else fout.set(String(x).trim(), (fout.get(String(x).trim()) || 0) + 1);
          }
          items.push({ nr: `${nr} · vak ${k + 1}`, juist, n: spelers.length, leeg, fout, sleutel: PfKern.veldSleutel(q)[k] });
        });
        continue;
      }
      const fout = new Map();
      let juist = 0;
      let leeg = 0;
      let open = 0;
      for (const s of spelers) {
        const x = s.antwoorden[id];
        const tekst = antwoordKort(q, x);
        const nog = !zelfGegeven(s, id) && PfKern.handPunten(q) && (s.hand[id] === null || s.hand[id] === undefined);
        if (nog) { open++; continue; }
        if (kreeg(s, id) >= max) juist++;
        else if (!tekst) leeg++;
        else if (!PfKern.MANUEEL.has(q.type)) fout.set(tekst, (fout.get(tekst) || 0) + 1);
      }
      items.push({ nr, vraag: q.vraag, juist, n: spelers.length - open, leeg, fout, sleutel: q.model || PfKern.oplossing(q), open });
    }
    blokken.push({ n, items });
  }
  $('v-analyse').innerHTML = blokken.map(({ n, items }) => `<div class="panel">
    ${multi ? `<h3>${Niveau.label(n)}</h3>` : ''}
    <p class="muted small">Gesorteerd van moeilijk naar makkelijk. Een rood balkje: hier is herhaling nodig.</p>
    <div class="pf-analyse">${items.slice().sort((x, y) => x.juist / (x.n || 1) - y.juist / (y.n || 1)).map(it => {
      const pct = it.n ? Math.round((it.juist / it.n) * 100) : 0;
      const top = [...it.fout.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3);
      return `<div class="pf-an-rij">
        <span class="pf-an-nr">Vraag ${esc(it.nr)}</span>
        <span class="pf-an-balk ${pct < 50 ? 'laag' : pct < 75 ? 'mid' : 'hoog'}"><i style="width:${pct}%"></i><b>${it.n ? `${pct}% juist` : 'nog niet verbeterd'}</b></span>
        <span class="pf-an-tekst">${it.vraag ? `${esc(it.vraag.slice(0, 90))}${it.vraag.length > 90 ? '…' : ''}<br>` : ''}${it.sleutel ? `<span class="pf-sleutel-klein">✔ ${esc(String(it.sleutel).slice(0, 80))}</span>` : ''}
          ${top.length ? `<br><span class="pf-an-fout">Vaakste fouten: ${top.map(([t, c]) => `<b>${esc(t.slice(0, 50))}</b> (${c}×)`).join(', ')}</span>` : ''}${it.leeg ? ` <span class="muted">· ${it.leeg}× niet ingevuld</span>` : ''}${it.open ? ` <span class="muted">· ${it.open} nog te verbeteren</span>` : ''}</span>
      </div>`;
    }).join('')}</div></div>`).join('');
}

$('v-klaar').addEventListener('click', async () => {
  const open = afname.spelers.reduce((n, s) => n + standVan(s).open, 0);
  if (open && !await Ui.vraag(`Nog ${open} antwoorden niet verbeterd. Die tellen voorlopig als 0. Toch klaar?`)) return;
  socket.emit('pf-klaar', afname.file, res => {
    if (res.error) return Ui.melding(res.error);
    afname.klaar = true;
    afname.resultaten = res.resultaten;
    renderAfname();
  });
});

// Vanaf het startscherm: meteen een nieuwe toets maken.
const params = new URLSearchParams(location.search);
if (params.get('maak') === 'ai') $('new-ai').click();
// Vanuit De Zonnewijzer: die toets meteen afnemen.
if (params.get('afnemen')) afnemen(params.get('afnemen'));
