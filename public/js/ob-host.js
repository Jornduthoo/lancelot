// Oefenbladen voor de leerkracht: maken (zelf of met AI), live openzetten, volgen en printen.
// Gebruikt sfx en confetti uit fx.js, ObSheet uit ob-sheet.js en ItemList uit quiz-list.js.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let hasKey = false;

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

let view = 'list';
const VIEWS = ['list', 'maker', 'editor', 'lobby'];
function show(name) {
  if (view !== name) window.scrollTo(0, 0);
  view = name;
  for (const s of VIEWS) $(s).classList.toggle('hidden', s !== name);
}

document.addEventListener('click', () => sfx.unlock(), { once: true });
$('mute').innerHTML = Ui.ic(sfx.muted ? 'stil' : 'geluid');
$('mute').addEventListener('click', () => { $('mute').innerHTML = Ui.ic(sfx.toggle() ? 'stil' : 'geluid'); });
$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });
for (const b of document.querySelectorAll('[data-back]')) b.addEventListener('click', () => show(b.dataset.back));

socket.on('settings', s => {
  hasKey = s.hasKey;
  $('a-gemini-panel').classList.toggle('hidden', !hasKey);
});

function downloadLink(file) {
  const link = document.createElement('a');
  link.href = `/resultaten/${encodeURIComponent(file)}`;
  link.download = file;
  link.textContent = 'Download voor Excel';
  return link;
}

// ---------- Lijst ----------

const TYPE_ICONS = { tekst: '📖', invullen: '✏️', meerkeuze: '🔘', juistfout: '✔✖', verbinden: '🔗', woorden: '🔤', overschrijven: '✍️', open: '💬' };

ItemList.mount($('sheet-list'), {
  kind: 'oefenblad',
  errorId: 'list-error',
  go: 'Live ▶',
  detail: s => `${s.count} ${s.count === 1 ? 'oefening' : 'oefeningen'} · ${s.types.map(t => TYPE_ICONS[t] || '').join(' ')}${(s.niveaus || []).length > 1 ? ` · ${s.niveaus.map(n => Niveau.ICONS[n]).join('')} ${s.niveaus.length} niveaus` : ''}`,
  play: s => goLive(s.file),
  buttons: [
    { label: '🖨 Print', cls: 'print', title: 'Afdrukken', click: s => window.open(`/oefenblad-print?file=${encodeURIComponent(s.file)}`, '_blank') },
    { label: 'Verbeterblad', cls: 'key', title: 'Verbeterblad afdrukken', click: s => window.open(`/oefenblad-print?file=${encodeURIComponent(s.file)}&sleutel=1`, '_blank') },
  ],
  edit: s => {
    socket.emit('ob-open', s.file, res => {
      if (res.error) return ($('list-error').textContent = res.error);
      openEditor(res.sheet, s.file);
    });
  },
  remove: async s => {
    if (!await Ui.vraag(`"${s.title}" verwijderen?`)) return;
    socket.emit('ob-delete', s.file, res => { $('list-error').textContent = res.error || ''; });
  },
});

function goLive(file) {
  $('stopped').classList.add('hidden');
  loadGame('ob-load', { file, feedback: $('ob-feedback').value, niveau: $('ob-niveau').value, voorlees: $('ob-voorlees').value }, res => {
    $('list-error').textContent = res.error || '';
    $('e-error').textContent = res.error || '';
  });
}

// Hoe de niveaus verdeeld worden, onthouden we op deze pc.
try { if (localStorage.getItem('lancelot-ob-niveau')) $('ob-niveau').value = localStorage.getItem('lancelot-ob-niveau'); } catch {}
$('ob-niveau').addEventListener('change', () => { try { localStorage.setItem('lancelot-ob-niveau', $('ob-niveau').value); } catch {} });

// ---------- Maken met AI ----------

let sources = [];
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

const FORMATS = {
  tekst: '{ "type": "tekst", "title": "titel van de leestekst", "text": "een korte leestekst of uitleg waar de oefeningen over gaan" }',
  invullen: '{ "type": "invullen", "instruction": "Vul de ontbrekende woorden in.", "text": "Een tekst met gaten. Het woord dat de leerling invult staat tussen vierkante haken, zoals de [hoofdstad]. Zijn meerdere antwoorden goed, scheid ze dan met een streep: [fiets|velo]." }',
  meerkeuze: '{ "type": "meerkeuze", "instruction": "Kies het juiste antwoord.", "items": [ { "question": "de vraag", "options": ["keuze A", "keuze B", "keuze C"], "correct": 1 } ] }',
  juistfout: '{ "type": "juistfout", "instruction": "Is de zin juist of fout?", "items": [ { "statement": "een stelling", "correct": true } ] }',
  verbinden: '{ "type": "verbinden", "instruction": "Verbind wat bij elkaar hoort.", "pairs": [ ["links", "rechts"], ["links", "rechts"] ] }',
  woorden: '{ "type": "woorden", "instruction": "Schrijf het juiste woord.", "items": [ { "prompt": "de opgave, bijv. een vertaling of omschrijving", "answer": "het woord" } ] }',
  overschrijven: '{ "type": "overschrijven", "instruction": "Schrijf de zinnen foutloos over.", "lines": ["een zin om over te schrijven"] }',
  open: '{ "type": "open", "instruction": "Beantwoord de vragen.", "items": [ { "question": "een open vraag", "lines": 3 } ] }',
};

function chosenTypes() {
  return [...$('a-types').querySelectorAll('input:checked')].map(i => i.value);
}

// De leerplandoelen waarover de AI oefeningen maakt (mag leeg). Elke oefening krijgt een van die doelen.
let makerDoel = null;

function withDoel(sheet) {
  if (!makerDoel) return sheet;
  for (const blocks of [sheet.blocks, sheet.page, sheet.ridder]) {
    if (blocks) DoelKies.apply(blocks.filter(b => b.type !== 'tekst'), makerDoel.codes());
  }
  return sheet;
}

function buildPrompt(forGemini = false) {
  const hasSources = forGemini ? sources.length > 0 : $('a-attach').checked;
  const codes = makerDoel ? makerDoel.codes() : [];
  const doel = DoelKies.find(codes[0]);
  const topic = $('a-topic').value.trim() || (doel ? doel.cluster : '') || (hasSources ? 'de bijgevoegde lesstof' : '[ONDERWERP]');
  const level = $('a-level').value;
  const count = Math.min(12, Math.max(1, Number($('a-count').value) || 5));
  const per = Math.min(20, Math.max(2, Number($('a-per').value) || 6));
  const extra = $('a-extra').value.trim();
  let types = chosenTypes();
  if (!types.filter(t => t !== 'tekst').length) types = [...types, 'invullen', 'meerkeuze'];
  const withText = types.includes('tekst');
  const kinds = types.filter(t => t !== 'tekst');
  const three = $('a-niveaus').checked;
  const blocks = `[
    ${types.map(t => FORMATS[t]).join(',\n    ')}
  ]`;
  return `Je bent een ervaren leerkracht in Vlaanderen. Maak een oefenblad (werkblad) voor leerlingen uit: ${level} (Belgisch onderwijs). Onderwerp: ${topic}.
${DoelKies.prompt(codes, 'oefeningen')}${hasSources ? '\nBaseer alle oefeningen op de bijgevoegde lesstof. Vraag alleen naar dingen die daarin staan.\n' : ''}${extra ? `\nExtra wensen van de docent:\n${extra}\n` : ''}
Regels:
- Maak ${count} oefeningen${three ? ' per niveau' : ''} in het Nederlands zoals in Vlaanderen, met ongeveer ${per} vragen of gaten per oefening.
- Gebruik deze soorten oefeningen, afwisselend: ${kinds.join(', ')}.${withText ? '\n- Begin met een korte leestekst ("tekst") waarop de oefeningen voortbouwen.' : ''}
- Elke oefening krijgt een korte, duidelijke opdrachtzin ("instruction") voor de leerling.
- Bij invullen staat elk in te vullen woord tussen [vierkante haken]. Kies woorden die eenduidig zijn, zodat de computer kan verbeteren.
- Bij woordjes is "answer" het woord dat de leerling typt; geef andere goede schrijfwijzen gescheiden door |.
- Bij verbinden: 4 tot 8 paren, elk woord maar één keer.
- Bij meerkeuze is "correct" het nummer van het goede antwoord, geteld vanaf 0. Zet het goede antwoord niet steeds op dezelfde plek.
- Pas moeilijkheid en taalgebruik aan het niveau ${level} aan.
${three ? `\n${Niveau.prompt(level, 'oefeningen')}\n` : ''}
Belangrijk: maak GEEN interactieve quiz, app, webpagina of canvas en schrijf geen code. Ik heb enkel de gegevens nodig als tekst.
Geef je antwoord als één codeblok met JSON (\`\`\`json … \`\`\`), zonder uitleg ervoor of erna, precies in dit formaat:
${three ? `{
  "title": "korte titel van het oefenblad",
  "niveaus": {
    "page": [ ...de oefeningen met hulp, in dezelfde vorm als bij schildknaap... ],
    "schildknaap": ${blocks.replace(/\n/g, '\n    ')},
    "ridder": [ ...de uitdagende oefeningen, in dezelfde vorm als bij schildknaap... ]
  }
}` : `{
  "title": "korte titel van het oefenblad",
  "blocks": ${blocks}
}`}`;
}

makerDoel = DoelKies.multi({
  // Het niveau volgt het leerjaar van de doelen.
  onChange: codes => {
    const doel = DoelKies.find(codes[0]);
    if (doel) $('a-level').value = DoelKies.naam(doel.leerjaar);
    updatePrompt();
  },
});
$('a-doel').appendChild(makerDoel);

function updatePrompt() {
  $('a-prompt').value = buildPrompt();
  $('a-copied').textContent = '';
}
for (const id of ['a-topic', 'a-level', 'a-count', 'a-per', 'a-extra', 'a-attach', 'a-niveaus']) $(id).addEventListener('input', updatePrompt);
$('a-attach').addEventListener('change', () => $('a-attach-note').classList.toggle('hidden', !$('a-attach').checked));
$('a-types').addEventListener('change', updatePrompt);
updatePrompt();

$('new-ai').addEventListener('click', () => {
  sources = [];
  renderSources();
  $('a-error').textContent = '';
  $('a-gemini-error').textContent = '';
  // Het niveau staat meteen op het leerjaar van de klas; de leerkracht kan het nog veranderen.
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
async function copyPrompt() {
  try {
    await navigator.clipboard.writeText($('a-prompt').value);
  } catch {
    $('a-prompt').select();
    document.execCommand('copy');
  }
  promptCopied = true;
  lastClipboard = $('a-prompt').value;
  $('a-copied').textContent = 'Gekopieerd! Plak hem in de chatbot, kopieer het antwoord (de kopieerknop van het codeblok) en kom hier terug.';
}
$('a-copy').addEventListener('click', copyPrompt);
for (const b of document.querySelectorAll('.chatbot')) {
  b.addEventListener('click', () => {
    window.open(b.dataset.url, '_blank', 'noopener');
    copyPrompt();
  });
}

function parseAnswer(text, quiet) {
  socket.emit('ob-parse', text, res => {
    if (res.error) {
      if (!quiet) $('a-error').textContent = res.error;
      return;
    }
    $('a-error').textContent = '';
    $('a-answer').value = '';
    openEditor(withDoel(res.sheet), null);
  });
}
$('a-parse').addEventListener('click', () => parseAnswer($('a-answer').value, false));
$('a-answer').addEventListener('paste', () => setTimeout(() => parseAnswer($('a-answer').value, false), 0));

// Terug uit de chatbot: staat het antwoord al op het klembord?
window.addEventListener('focus', async () => {
  if (view !== 'maker' || !promptCopied || !navigator.clipboard?.readText) return;
  let text;
  try { text = await navigator.clipboard.readText(); } catch { return; }
  if (!text || text === lastClipboard || !(text.includes('"blocks"') || text.includes('"niveaus"'))) return;
  lastClipboard = text;
  parseAnswer(text, true);
});

function renderSources() {
  const list = $('a-file-list');
  list.innerHTML = '';
  sources.forEach((src, i) => {
    const li = document.createElement('li');
    li.innerHTML = '<span></span><button class="secondary" title="Verwijderen">✕</button>';
    li.querySelector('span').textContent = `${src.name} (${Math.ceil(src.size / 1024)} kB)`;
    li.querySelector('button').addEventListener('click', () => { sources.splice(i, 1); renderSources(); });
    list.appendChild(li);
  });
}

function addSource(file) {
  if (!/^image\/|^application\/pdf$/.test(file.type)) {
    $('a-gemini-error').textContent = `${file.name}: alleen afbeeldingen en pdf's kunnen als lesstof.`;
    return;
  }
  if (sources.reduce((sum, s) => sum + s.size, 0) + file.size > MAX_SOURCE_BYTES) {
    $('a-gemini-error').textContent = 'De lesstof is samen groter dan 15 MB.';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    sources.push({ name: file.name, mimeType: file.type, size: file.size, data: reader.result.split(',')[1] });
    renderSources();
  };
  reader.readAsDataURL(file);
}
$('a-files').addEventListener('change', e => {
  $('a-gemini-error').textContent = '';
  [...e.target.files].forEach(addSource);
  e.target.value = '';
});
document.addEventListener('paste', e => {
  if (view !== 'maker' || !hasKey || e.target.id === 'a-answer') return;
  const files = [...(e.clipboardData?.files || [])];
  if (!files.length) return;
  e.preventDefault();
  files.forEach((f, i) => addSource(new File([f], f.name === 'image.png' ? `screenshot-${sources.length + i + 1}.png` : f.name, { type: f.type })));
});

$('a-gemini').addEventListener('click', () => {
  $('a-gemini-error').textContent = '';
  $('a-gemini').disabled = true;
  $('a-gemini-busy').textContent = 'Gemini is bezig… dit duurt meestal 10 tot 40 seconden.';
  socket.emit('ob-generate', { prompt: buildPrompt(true), files: sources.map(({ mimeType, data }) => ({ mimeType, data })) }, res => {
    $('a-gemini').disabled = false;
    $('a-gemini-busy').textContent = '';
    if (res.error) return ($('a-gemini-error').textContent = res.error);
    openEditor(withDoel(res.sheet), null);
  });
});

// ---------- Bewerken ----------
// Elke oefening wordt bewerkt als gewone tekst, één vraag per regel. Zo typ je snel een blad.

const EDIT_HELP = {
  tekst: 'Een leestekst of uitleg. Laat een lege regel tussen alinea\'s.',
  invullen: 'Zet de woorden die de leerling invult tussen [ en ]. Meerdere goede antwoorden: [fiets|velo]. Hoofdletters tellen mee, schrijf het antwoord zoals het in de zin hoort.',
  meerkeuze: 'Eén vraag per regel: vraag | keuze | keuze | keuze. Zet een * voor het goede antwoord.',
  juistfout: 'Eén zin per regel, met | J (juist) of | F (fout) erachter.',
  verbinden: 'Eén paar per regel: links = rechts. De rechterkant wordt voor de leerlingen door elkaar gezet.',
  woorden: 'Eén woord per regel: opgave = antwoord. Andere goede schrijfwijzen: antwoord | ander antwoord. Hoofdletters tellen mee.',
  overschrijven: 'Eén zin per regel. De leerling schrijft hem foutloos over (hoofdletters en leestekens tellen mee).',
  open: 'Eén vraag per regel. Deze vragen worden niet automatisch verbeterd; je leest ze op het bord.',
};
const EXAMPLES = {
  tekst: 'Koning Leopold I werd in 1831 de eerste koning van België.',
  invullen: 'De hoofdstad van België is [Brussel]. Ons land heeft [drie] officiële talen.',
  meerkeuze: 'Hoeveel provincies heeft België? | 9 | *10 | 11',
  juistfout: 'België is een koninkrijk. | J\nDe Schelde stroomt door Luik. | F',
  verbinden: 'Antwerpen = Schelde\nLuik = Maas\nGent = Leie',
  woorden: 'de hond = le chien\nde kat = le chat',
  overschrijven: 'De kat zit op de mat.',
  open: 'Waarom is de Schelde belangrijk voor Antwerpen?',
};

function blockToText(b) {
  if (b.type === 'tekst' || b.type === 'invullen') return b.text;
  if (b.type === 'meerkeuze') return b.items.map(q => [q.question, ...q.options.map((o, i) => (i === q.correct ? `*${o}` : o))].join(' | ')).join('\n');
  if (b.type === 'juistfout') return b.items.map(q => `${q.statement} | ${q.correct ? 'J' : 'F'}`).join('\n');
  if (b.type === 'verbinden') return b.pairs.map(p => `${p.left} = ${p.right}`).join('\n');
  if (b.type === 'woorden') return b.items.map(q => `${q.prompt} = ${q.answer}`).join('\n');
  if (b.type === 'overschrijven') return b.lines.join('\n');
  if (b.type === 'open') return b.items.map(q => q.question).join('\n');
  return '';
}

function textToBlock(type, instruction, title, body) {
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  const split = (l, sep) => {
    const i = l.indexOf(sep);
    return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + sep.length).trim()];
  };
  if (type === 'tekst') return { type, title, text: body };
  if (type === 'invullen') return { type, instruction, text: body };
  if (type === 'meerkeuze') {
    return {
      type, instruction, items: lines.map(l => {
        const [question, ...rest] = l.split('|').map(s => s.trim());
        return { question, options: rest.map(o => o.replace(/^\*\s*/, '')), correct: rest.findIndex(o => o.startsWith('*')) };
      }),
    };
  }
  if (type === 'juistfout') return { type, instruction, items: lines.map(l => { const [statement, c] = split(l, '|'); return { statement, correct: /^j/i.test(c) }; }) };
  if (type === 'verbinden') return { type, instruction, pairs: lines.map(l => { const [left, right] = split(l, '='); return { left, right }; }) };
  if (type === 'woorden') return { type, instruction, items: lines.map(l => { const [prompt, answer] = split(l, '='); return { prompt, answer }; }) };
  if (type === 'overschrijven') return { type, instruction, lines };
  return { type, instruction, items: lines.map(question => ({ question, lines: 3 })) };
}

const DEFAULT_INSTRUCTION = {
  invullen: 'Vul de ontbrekende woorden in.', meerkeuze: 'Kies het juiste antwoord.', juistfout: 'Is de zin juist of fout?',
  verbinden: 'Verbind wat bij elkaar hoort.', woorden: 'Schrijf het juiste woord.', overschrijven: 'Schrijf de zinnen foutloos over.', open: 'Beantwoord de vragen.',
};

let editingFile = null;

function blockCard(b) {
  const card = document.createElement('div');
  card.className = 'panel ob-edit-block';
  card.dataset.type = b.type;
  card.innerHTML = `<div class="ob-edit-head"><strong>${ObSheet.NAMES[b.type]}</strong>
      <div class="actions"><button class="secondary up" title="Omhoog">▲</button><button class="secondary down" title="Omlaag">▼</button><button class="secondary del" title="Verwijderen">✕</button></div></div>
    ${b.type === 'tekst' ? '<label>Titel (mag leeg)<input class="e-btitle" maxlength="100"></label>' : '<label>Opdracht<input class="e-instr" maxlength="200"></label>'}
    <label>Inhoud<textarea class="e-body" rows="5" spellcheck="true"></textarea></label>
    <p class="muted small">${EDIT_HELP[b.type]}</p>`;
  if (b.type !== 'tekst') card.appendChild(DoelKies.field(b.doel, { onChange: () => preview() }));
  if (b.type === 'tekst') card.querySelector('.e-btitle').value = b.title || '';
  else card.querySelector('.e-instr').value = b.instruction || DEFAULT_INSTRUCTION[b.type];
  const body = card.querySelector('.e-body');
  body.value = b.text !== undefined || b.items || b.pairs || b.lines ? blockToText(b) : '';
  body.placeholder = EXAMPLES[b.type];
  body.rows = Math.min(14, Math.max(4, body.value.split('\n').length + 1));
  card.querySelector('.up').addEventListener('click', () => { if (card.previousElementSibling) card.parentNode.insertBefore(card, card.previousElementSibling); preview(); });
  card.querySelector('.down').addEventListener('click', () => { if (card.nextElementSibling) card.parentNode.insertBefore(card.nextElementSibling, card); preview(); });
  card.querySelector('.del').addEventListener('click', () => { card.remove(); preview(); });
  card.addEventListener('input', preview);
  return card;
}

// Elk niveau heeft een eigen lijst oefeningen. Schildknaap is het gewone blad; Page en Ridder mogen leeg blijven.
let editNiveau = 'schildknaap';
const blockBox = n => $(n === 'schildknaap' ? 'e-blocks' : `e-blocks-${n}`);

function readBlocks(box) {
  return [...box.children].map(card => {
      const block = textToBlock(
        card.dataset.type,
        card.querySelector('.e-instr') ? card.querySelector('.e-instr').value : '',
        card.querySelector('.e-btitle') ? card.querySelector('.e-btitle').value : '',
        card.querySelector('.e-body').value,
      );
      const doel = card.querySelector('.doel-veld');
      return doel && DoelKies.read(doel) ? { ...block, doel: DoelKies.read(doel) } : block;
  });
}

function readEditor() {
  const sheet = { title: $('e-title').value, blocks: readBlocks($('e-blocks')) };
  for (const n of ['page', 'ridder']) {
    const blocks = readBlocks(blockBox(n));
    if (blocks.length) sheet[n] = blocks;
  }
  return sheet;
}

function showNiveau(n) {
  editNiveau = n;
  for (const l of Niveau.LIST) blockBox(l).classList.toggle('hidden', l !== n);
  renderNiveauTabs();
  preview();
}

function renderNiveauTabs() {
  for (const b of $('e-niveaus').querySelectorAll('button')) {
    const n = b.dataset.niveau;
    const count = blockBox(n).children.length;
    b.classList.toggle('on', n === editNiveau);
    b.textContent = `${Niveau.label(n)} · ${Niveau.HELP[n]}${n === 'schildknaap' || count ? ` (${count})` : ''}`;
  }
  const help = $('e-niveau-help');
  help.innerHTML = '';
  if (editNiveau === 'schildknaap') {
    help.textContent = 'Het gewone blad: het doel zelf. Page (met hulp) en Ridder (uitdaging) zijn extra versies; laat ze leeg als je ze niet nodig hebt.';
  } else if (!blockBox(editNiveau).children.length) {
    help.append(`Nog leeg: wie op ${Niveau.NAMES[editNiveau]} staat, krijgt het Schildknaap-blad. `);
    const copy = document.createElement('button');
    copy.className = 'secondary small-btn';
    copy.textContent = 'Begin met een kopie van Schildknaap';
    copy.addEventListener('click', () => {
      for (const b of readBlocks($('e-blocks'))) blockBox(editNiveau).appendChild(blockCard(b));
      renderNiveauTabs();
      preview();
    });
    help.appendChild(copy);
  } else {
    help.textContent = editNiveau === 'page'
      ? 'Page: dezelfde leerstof met hulp, bijvoorbeeld een voorbeeld in de opdracht, minder keuzes of een woordenbank.'
      : 'Ridder: dezelfde leerstof als uitdaging, bijvoorbeeld moeilijker, toepassen of een stap verder.';
  }
}
for (const b of $('e-niveaus').querySelectorAll('button')) b.addEventListener('click', () => showNiveau(b.dataset.niveau));

// Het voorbeeld rechts: zoals de leerling het blad ziet. Fouten verschijnen onderaan.
let previewTimer = null;
function preview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    socket.emit('ob-check', readEditor(), res => {
      $('e-error').textContent = res.error || '';
      renderNiveauTabs();
      if (res.sheet) ObSheet.render($('e-preview'), previewView({ title: res.sheet.title, blocks: res.sheet[editNiveau] || res.sheet.blocks }), { mode: 'view' });
    });
  }, 300);
}

// Zelfde vorm als wat leerlingen krijgen (zonder door elkaar te schudden).
function previewView(sheet) {
  return {
    title: sheet.title,
    blocks: sheet.blocks.map((b, bi) => {
      if (b.type === 'invullen') {
        const parts = [];
        let last = 0;
        let g = 0;
        for (const m of b.text.matchAll(/\[([^\[\]]+)\]/g)) {
          parts.push(b.text.slice(last, m.index));
          parts.push({ gap: `${bi}.${g++}`, size: Math.min(28, Math.max(5, Math.max(...m[1].split('|').map(s => s.trim().length)) + 2)) });
          last = m.index + m[0].length;
        }
        parts.push(b.text.slice(last));
        return { type: b.type, instruction: b.instruction, parts };
      }
      if (b.type === 'verbinden') return { ...b, left: b.pairs.map(p => p.left), right: b.pairs.map(p => p.right) };
      return b;
    }),
  };
}

function openEditor(sheet, file) {
  editingFile = file;
  $('e-heading').textContent = file ? 'Oefenblad bewerken' : 'Nieuw oefenblad';
  $('e-title').value = sheet.title || '';
  for (const n of Niveau.LIST) {
    blockBox(n).innerHTML = '';
    for (const b of (n === 'schildknaap' ? sheet.blocks : sheet[n]) || []) blockBox(n).appendChild(blockCard(b));
  }
  $('e-error').textContent = '';
  show('editor');
  showNiveau('schildknaap');
}

$('e-add').innerHTML = Object.keys(EDIT_HELP).map(t => `<button class="secondary" data-type="${t}">+ ${ObSheet.NAMES[t]}</button>`).join('');
for (const b of $('e-add').querySelectorAll('button')) {
  b.addEventListener('click', () => {
    const card = blockCard({ type: b.dataset.type });
    blockBox(editNiveau).appendChild(card);
    card.querySelector('.e-body').focus();
    preview();
  });
}
$('e-title').addEventListener('input', preview);

$('new-empty').addEventListener('click', () => openEditor({ title: '', blocks: [{ type: 'invullen' }] }, null));

function save(then, fail) {
  socket.emit('ob-save', { sheet: readEditor(), file: editingFile }, res => {
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
$('e-live').addEventListener('click', () => save(file => goLive(file)));
// Printen: het werkblad en het verbeterblad openen elk in een eigen tabblad.
$('e-print').addEventListener('click', () => {
  const sheetTab = window.open('', '_blank');
  const keyTab = window.open('', '_blank');
  save(file => {
    const url = `/oefenblad-print?file=${encodeURIComponent(file)}`;
    if (sheetTab) sheetTab.location = url;
    if (keyTab) keyTab.location = `${url}&sleutel=1`;
    show('list');
  }, () => { if (sheetTab) sheetTab.close(); if (keyTab) keyTab.close(); });
});

// ---------- Live ----------

socket.on('ob-state', s => {
  const prev = state;
  state = s;
  $('stop').classList.toggle('hidden', !s.active);
  $('status').textContent = s.active ? `Oefenblad · ${s.title}` : 'Oefenbladen';
  if (!s.active) {
    if (view === 'lobby') show('list');
    return;
  }
  if (view !== 'lobby') show('lobby');
  renderLive(prev);
});

function renderLive(prev) {
  const s = state;
  $('l-title').textContent = s.title;
  const r = s.ranking;
  const done = r.filter(p => p.submitted).length;
  $('l-summary').textContent = `${r.length} ${r.length === 1 ? 'leerling' : 'leerlingen'} · ${done} ingeleverd`;
  $('l-reveal').textContent = s.revealed ? 'Verberg oplossingen' : 'Toon oplossingen';
  $('l-finish').classList.toggle('hidden', s.phase !== 'open');
  $('l-reopen').classList.toggle('hidden', !done);
  $('l-feedback').textContent = s.phase === 'einde'
    ? 'Het blad is afgesloten. Klik op een naam om het blad van die leerling te bekijken of het voor die leerling weer open te zetten.'
    : s.feedback === 'direct' ? 'De leerlingen zien meteen of een vakje goed of fout is. Klik op een naam om mee te kijken.' : 'De leerlingen zien pas na het inleveren wat goed of fout is. Klik op een naam om mee te kijken.';
  const box = $('l-students');
  if (!r.length) box.innerHTML = '<p class="muted">Nog niemand. Laat de leerlingen de QR-code scannen.</p>';
  else {
    box.innerHTML = r.map(p => {
      const pct = p.total ? Math.round((p.right / p.total) * 100) : 0;
      const lvl = s.multi ? ` <span class="ob-niveau-tag ${p.niveau}" title="${Niveau.NAMES[p.niveau]} (${Niveau.HELP[p.niveau]})">${p.choosing ? '… kiest niveau' : Niveau.label(p.niveau)}</span>` : '';
      return `<button class="ob-student${p.submitted ? ' in' : ''}" data-id="${esc(p.id)}">
        <span class="n">${esc(p.name)}${lvl}${p.submitted ? ' <em>✔ ingeleverd</em>' : ''}</span>
        <span class="bar"><i style="width:${(p.done / p.total) * 100}%"></i></span>
        <span class="s"><b class="g">${p.right}</b> goed · <b class="f">${p.wrong}</b> fout · ${p.done}/${p.total} ingevuld${p.submitted ? ` · ${pct}%` : ''}</span>
      </button>`;
    }).join('');
    for (const b of box.querySelectorAll('.ob-student')) b.addEventListener('click', () => openDetail(b.dataset.id));
    if (prev && prev.ranking && r.length > prev.ranking.length) sfx.join();
  }
  // Per oefening: hoeveel van wat ingevuld is, is goed? Bij niveaus per niveau dat in gebruik is.
  const used = s.multi ? Niveau.LIST.filter(n => s.levels[n] && r.some(p => p.niveau === n)) : ['schildknaap'];
  $('l-stats').innerHTML = (used.length ? used : ['schildknaap']).map(niv => {
    const level = s.levels[niv] || { sheet: s.sheet, stats: s.stats };
    return (s.multi ? `<h4 class="ob-stat-niveau">${Niveau.label(niv)}</h4>` : '') + statsHtml(level.sheet.blocks, level.stats);
  }).join('');
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (s.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(s.resultsFile));
  }
  if (detailId) openDetail(detailId, true);
}

function statsHtml(blocks, stats) {
  let n = 0;
  return blocks.map((b, bi) => {
    if (b.type === 'tekst') return '';
    n++;
    const fs = stats.filter(f => f.block === bi);
    if (b.type === 'open') {
      const filled = fs.reduce((a, f) => a + f.filled, 0);
      return `<div class="ob-stat"><span>${n}. ${ObSheet.NAMES[b.type]}</span><span class="muted">${filled} antwoorden</span></div>`;
    }
    const filled = fs.reduce((a, f) => a + f.filled, 0);
    const right = fs.reduce((a, f) => a + f.right, 0);
    const pct = filled ? Math.round((right / filled) * 100) : 0;
    const hardest = fs.filter(f => f.filled).sort((x, y) => x.right / x.filled - y.right / y.filled)[0];
    return `<div class="ob-stat"><span>${n}. ${ObSheet.NAMES[b.type]}</span><span class="pct ${pct >= 75 ? 'hi' : pct >= 50 ? 'mid' : 'lo'}">${filled ? `${pct}%` : '–'}</span>
      <span class="sbar"><i style="width:${pct}%"></i></span>${hardest && filled > 2 && hardest.right / hardest.filled < .6 ? `<span class="muted small">Moeilijkst: vraag ${Number(hardest.id.split('.')[1]) + 1}</span>` : ''}</div>`;
  }).join('');
}

// Meekijken op het blad van één leerling.
let detailId = null;
function openDetail(id, refresh) {
  socket.emit('ob-detail', id, res => {
    if (res.error) return;
    detailId = id;
    $('d-name').textContent = `${res.name}${res.submitted ? ' · ingeleverd' : ''}`;
    $('d-reopen').classList.toggle('hidden', !res.submitted);
    renderDetailNiveaus(id, res.niveau);
    const scroll = $('detail').querySelector('.ob-modal-box').scrollTop;
    const level = (state.levels && state.levels[res.niveau]) || state;
    ObSheet.render($('d-paper'), hostView(level), { mode: 'view', answers: res.answers, results: res.results, solutions: level.solutions });
    $('detail').classList.remove('hidden');
    if (refresh) $('detail').querySelector('.ob-modal-box').scrollTop = scroll;
  });
}
$('d-close').addEventListener('click', () => { detailId = null; $('detail').classList.add('hidden'); });
$('detail').addEventListener('click', e => { if (e.target.id === 'detail') $('d-close').click(); });

// Een leerling op een ander niveau zetten. Hij begint dan op het andere blad.
function renderDetailNiveaus(id, current) {
  const box = $('d-niveaus');
  box.classList.toggle('hidden', !state.multi);
  if (!state.multi) return;
  box.innerHTML = Niveau.LIST.filter(n => state.levels[n]).map(n => `<button type="button" class="secondary${n === current ? ' on' : ''}" data-niveau="${n}" title="${Niveau.HELP[n]}">${Niveau.label(n)}</button>`).join('');
  for (const b of box.querySelectorAll('button')) {
    b.addEventListener('click', async () => {
      const n = b.dataset.niveau;
      if (n === current) return;
      const r = state.ranking.find(p => p.id === id);
      if (r && r.done && !await Ui.vraag(`${r.name} op ${Niveau.NAMES[n]} zetten? Het blad begint dan opnieuw; wat al ingevuld is, vervalt.`)) return;
      socket.emit('ob-set-niveau', { id, niveau: n }, () => openDetail(id, true));
    });
  }
}

// Het blad zoals de leerlingen het zien, met dezelfde volgorde bij verbinden. level: { sheet, shuffles } van een niveau.
function hostView(level = state) {
  const v = previewView(level.sheet);
  v.blocks = v.blocks.map((b, bi) => (b.type === 'verbinden' ? { ...b, right: level.shuffles[bi].map(i => level.sheet.blocks[bi].pairs[i].right) } : b));
  return v;
}

$('l-reveal').addEventListener('click', () => socket.emit('ob-reveal'));
// Een ingeleverd blad weer openzetten; de antwoorden blijven staan.
$('d-reopen').addEventListener('click', () => {
  if (detailId) socket.emit('ob-reopen', detailId, () => openDetail(detailId, true));
});
$('l-reopen').addEventListener('click', async () => {
  const msg = state.phase === 'einde'
    ? 'Het blad weer openzetten voor iedereen? De leerlingen werken verder met hun antwoorden. Sluit daarna opnieuw af om de nieuwe resultaten te bewaren.'
    : 'Het blad weer openzetten voor iedereen die al inleverde? Hun antwoorden blijven staan.';
  if (await Ui.vraag(msg)) socket.emit('ob-reopen', null);
});
$('l-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het oefenblad afsluiten? Wie nog bezig is, levert automatisch in. De resultaten worden bewaard.')) socket.emit('ob-finish');
});
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het oefenblad sluiten en terug naar de lijst?')) return;
  socket.emit('ob-stop', null, res => {
    const note = $('stopped');
    note.innerHTML = '';
    note.append('Het oefenblad is gesloten.');
    if (res && res.file) {
      note.append(' De resultaten zijn bewaard. ');
      note.append(downloadLink(res.file));
    }
    note.classList.remove('hidden');
    show('list');
  });
});

// Vanaf het startscherm: meteen een nieuw blad maken.
const params = new URLSearchParams(location.search);
if (params.get('maak') === 'ai') $('new-ai').click();
