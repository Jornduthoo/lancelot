// Het Runenraadsel op het bord: wie kraakte het al (alleen kleuren), het klasdoel, de runenmeesters,
// de onthulling van de woorden met betekenis, en de woorden van de week van de leerkracht.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const NIVEAUS = [['page', 'Page'], ['schildknaap', 'Schildknaap'], ['ridder', 'Ridder']];
const KRANS = ['', 'Runengloed', 'Zilveren runen', 'Gouden runen', 'Sterrenrunen'];

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });

function dagNaam(dag) {
  return new Date(`${dag}T12:00:00`).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function render(b) {
  $('rnh-dag').textContent = dagNaam(b.dag);
  const d = b.klasdoel;
  $('rnh-klas-balk').style.width = `${Math.min(100, Math.round((d.gekraakt / Math.max(1, d.nodig)) * 100))}%`;
  $('rnh-klas-tekst').textContent = d.gehaald
    ? `🎉 Gehaald! ${d.gekraakt} ridders kraakten het raadsel. Iedereen die het kraakte krijgt een rune extra.`
    : `${d.gekraakt} van de ${d.nodig} ridders die nodig zijn (8 op 10 van de klas).`;

  const box = $('rnh-niveaus');
  box.innerHTML = '';
  for (const [id, naam] of NIVEAUS) {
    const n = b.perNiveau[id];
    const col = el('div', 'panel rnh-niveau');
    const kop = el('div', 'rnh-kop');
    const opgelost = n.spelers.filter(p => p.status === 'opgelost').length;
    kop.innerHTML = `<span class="rnh-naam"></span><span class="rnh-lengte"></span><b class="rnh-teller">${opgelost} ✓</b>`;
    kop.querySelector('.rnh-naam').textContent = naam;
    kop.querySelector('.rnh-lengte').textContent = `${n.lengte} letters${n.eigen ? ' · woord van de week' : ''}`;
    col.appendChild(kop);
    // Lege tegels als voorproefje van de lengte.
    const leeg = el('div', 'rnh-leeg');
    for (let i = 0; i < n.lengte; i++) leeg.appendChild(el('span'));
    col.appendChild(leeg);
    const lijst = el('div', 'rnh-spelers');
    if (!n.spelers.length) lijst.appendChild(el('p', 'muted small', 'Nog niemand gespeeld.'));
    for (const p of n.spelers) {
      const kaart = el('div', `rnh-speler ${p.status}`);
      const wie = el('span', 'rnh-wie', p.naam);
      wie.dataset.av = p.naam;
      kaart.appendChild(wie);
      const mini = el('div', 'rnh-mini');
      mini.style.setProperty('--n', n.lengte);
      for (const rij of p.rijen) for (const k of rij) mini.appendChild(el('i', k));
      kaart.appendChild(mini);
      kaart.appendChild(el('b', 'rnh-status', p.status === 'opgelost' ? `${p.rijen.length}/6` : p.status === 'mislukt' ? '✗' : '…'));
      lijst.appendChild(kaart);
    }
    col.appendChild(lijst);
    box.appendChild(col);
  }

  const rang = $('rnh-rang');
  rang.innerHTML = '';
  if (!b.rang.length) rang.appendChild(el('p', 'muted small', 'Nog geen runen verdiend.'));
  for (const r of b.rang) {
    const li = el('li');
    const naam = el('span', 'rnh-wie', r.naam);
    naam.dataset.av = r.naam;
    li.appendChild(naam);
    if (r.krans) li.appendChild(el('em', 'rnh-krans', KRANS[r.krans]));
    li.appendChild(el('b', '', `${r.runen} runen`));
    li.appendChild(el('span', 'rnh-vuur', r.reeks ? `🔥 ${r.reeks}` : ''));
    rang.appendChild(li);
  }
}

function load() {
  socket.emit('rn-bord', null, res => {
    if (res && res.bord) render(res.bord);
  });
  socket.emit('rn-lijst-get', null, res => {
    if (!res || res.error) return;
    const sel = $('rnh-doel');
    sel.innerHTML = '<option value="">Geen doel</option>';
    for (const d of res.doelen) {
      const o = el('option', '', `${d.code} · ${d.tekst.slice(0, 90)}${d.tekst.length > 90 ? '…' : ''}`);
      o.value = d.code;
      sel.appendChild(o);
    }
    aiPrompt = res.prompt || '';
    lijst(res.lijst);
  });
}

function lijst(l) {
  $('rnh-lijst').value = l.text;
  // Nog geen eigen lijst: standaard het woordenschatdoel van het 6e leerjaar (als het in de keuzelijst staat).
  $('rnh-doel').value = l.doel || (l.woorden.length ? '' : '1.5.GL6.3');
  const chips = $('rnh-chips');
  chips.innerHTML = '';
  for (const w of l.woorden) {
    const c = el('span', `rnh-chip${w.gebruikt ? ' gebruikt' : ''}`, w.w);
    c.title = w.gebruikt ? 'Al aan bod gekomen' : `Komt nog: ${w.niveau}`;
    chips.appendChild(c);
  }
  const open = l.woorden.filter(w => !w.gebruikt).length;
  $('rnh-lijst-info').textContent = l.woorden.length
    ? `${open} van de ${l.woorden.length} woorden komen nog aan bod. Doorgestreept = al geweest.`
    : 'Geen woorden van de week: LANcelot kiest uit zijn eigen lijst voor het 6e leerjaar.';
}

socket.on('connect', load);
socket.on('rn-bord', render);
socket.on('settings', s => Ui.zetAi(s));
socket.on('addresses', list => {
  if (!list || !list.length) return;
  $('rnh-qr').innerHTML = list[0].qr;
  $('rnh-url').textContent = `${list[0].url}/runen`;
});

// Woorden die niet passen worden overgeslagen; zeg welke, zodat de leerkracht ze kan vervangen.
const weg = res => res.overgeslagen?.length
  ? ` Overgeslagen (niet 4 tot 7 letters of met spaties): ${res.overgeslagen.slice(0, 8).join(', ')}${res.overgeslagen.length > 8 ? '…' : ''}.`
  : '';

$('rnh-bewaar').addEventListener('click', () => {
  socket.emit('rn-lijst-save', { text: $('rnh-lijst').value, doel: $('rnh-doel').value }, res => {
    if (res.error) return ($('rnh-lijst-info').textContent = res.error);
    lijst(res.lijst);
    $('rnh-bewerk').open = false;
    $('rnh-lijst-info').textContent = `Bewaard. ${$('rnh-lijst-info').textContent}${weg(res.lijst)}`;
    sfx.good();
  });
});

$('rnh-ai').addEventListener('click', () => {
  const b = $('rnh-ai');
  b.disabled = true;
  $('rnh-lijst-info').textContent = `${Ui.ai} zoekt betekenissen en voorbeeldzinnen…`;
  socket.emit('rn-lijst-ai', { text: $('rnh-lijst').value }, res => {
    b.disabled = false;
    if (res.error) return ($('rnh-lijst-info').textContent = res.error);
    $('rnh-lijst').value = res.text;
    $('rnh-lijst-info').textContent = res.open > res.aangevuld
      ? `${res.aangevuld} van de ${res.open} woorden aangevuld. Kijk ze even na en klik op Bewaar.`
      : 'Aangevuld. Kijk ze even na en klik op Bewaar.';
    $('rnh-lijst-info').textContent += weg(res);
  });
});

$('rnh-thema-ai').addEventListener('click', () => {
  const b = $('rnh-thema-ai');
  b.disabled = true;
  $('rnh-lijst-info').textContent = `${Ui.ai} zoekt woorden rond je thema…`;
  socket.emit('rn-lijst-thema', { thema: $('rnh-thema').value, text: $('rnh-lijst').value }, res => {
    b.disabled = false;
    if (res.error) return ($('rnh-lijst-info').textContent = res.error);
    $('rnh-lijst').value = res.text;
    const p = res.per;
    $('rnh-lijst-info').textContent = `${res.nieuw} woorden toegevoegd (Page ${p.page}, Schildknaap ${p.schildknaap}, Ridder ${p.ridder}). Kijk ze even na en klik op Bewaar.${weg(res)}`;
  });
});

// Zelf via een chatbot: prompt kopiëren, chatbot openen, en het antwoord bij terugkomst van het klembord halen.
let aiPrompt = '';
let gekopieerd = '';

const kopieer = text => Ui.kopieer(text);

for (const b of document.querySelectorAll('.chatbot')) {
  b.addEventListener('click', () => {
    const thema = $('rnh-thema').value.trim();
    if (!thema) return ($('rnh-lijst-info').textContent = 'Typ eerst een thema, bijvoorbeeld "de middeleeuwen".');
    gekopieerd = aiPrompt.replace('{thema}', thema);
    // Eerst kopiëren (de pagina heeft dan nog de focus), dan het tabblad openen.
    kopieer(gekopieerd);
    window.open(b.dataset.url, '_blank', 'noopener');
    $('rnh-lijst-info').textContent = 'Prompt gekopieerd! Plak hem met Ctrl+V, kopieer het antwoord (kopieerknop van het codeblok) en kom hier terug.';
  });
}

async function klembord() {
  if (!gekopieerd || !navigator.clipboard?.readText) return;
  let text;
  try { text = await navigator.clipboard.readText(); } catch { return; }
  if (!text || text === gekopieerd || (text.match(/=.*\|/g) || []).length < 3) return;
  gekopieerd = text;
  const oud = $('rnh-lijst').value.trim();
  $('rnh-lijst').value = (oud ? oud + '\n' : '') + text.replace(/^\s*```.*$/gm, '').trim();
  $('rnh-lijst-info').textContent = 'Antwoord van de AI geplakt. Kijk de woorden even na en klik op Bewaar.';
}
window.addEventListener('focus', klembord);

// ---------- De onthulling ----------

$('rnh-onthul').addEventListener('click', async () => {
  if (!await Ui.vraag('De woorden van vandaag op het bord tonen? Wie nog niet speelde, ziet dan het antwoord.')) return;
  socket.emit('rn-onthul', null, res => {
    if (!res || res.error) return;
    const box = $('rnh-onthulling');
    box.innerHTML = '';
    let t = 0;
    for (const [id, naam] of NIVEAUS) {
      const x = res.woorden[id];
      const kaart = el('div', 'rnh-onthul-kaart');
      kaart.style.animationDelay = `${t}ms`;
      kaart.appendChild(el('p', 'rn-kaart-kop', naam));
      const woord = el('div', 'rnh-groot');
      [...x.woord].forEach((c, i) => {
        const s = el('span', 'rn-tegel g flip', c);
        s.style.animationDelay = `${t + 300 + i * 160}ms`;
        woord.appendChild(s);
      });
      kaart.appendChild(woord);
      const bet = el('p', 'rnh-bet');
      bet.textContent = x.betekenis || '(geen betekenis: vraag de klas!)';
      bet.style.animationDelay = `${t + 400 + x.woord.length * 160}ms`;
      kaart.appendChild(bet);
      if (x.zin) {
        const zin = el('p', 'rnh-zin', `“${x.zin}”`);
        zin.style.animationDelay = `${t + 600 + x.woord.length * 160}ms`;
        kaart.appendChild(zin);
      }
      box.appendChild(kaart);
      t += 500 + x.woord.length * 160;
    }
    $('rnh-overlay').classList.remove('hidden');
    sfx.drumroll && sfx.drumroll(1.2);
    setTimeout(() => { sfx.fanfare(); confetti(3000); }, t);
  });
});
$('rnh-sluit').addEventListener('click', () => $('rnh-overlay').classList.add('hidden'));
