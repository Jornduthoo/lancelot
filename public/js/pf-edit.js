// De editor van een vraag van De Proef: een kaart per vraag, met alle soorten (ook een blad uit de pdf).
// Gedeeld door De Proef (pf-host.js) en de oefenbladen (ob-host.js), zodat je overal op dezelfde manier werkt.
// Gebruikt PfKern, PfPaper (esc, nl), PfBlad, PfKnip, PfAudio, DoelKies en Ui.
// PfEdit.config({ preview, ai, niveau }): preview() na elke wijziging, ai() geeft de functie om bladen te laten verbeteren (of null),
// niveau() het leerjaar voor de AI.
const PfEdit = (() => {
  const cfg = { preview: () => {}, ai: () => null, niveau: () => '' };
  const esc = PfPaper.esc;
  const nl = PfPaper.nl;

  const TYPE_ICONS = { meerkeuze: '🔘', juistfout: '✔✖', invullen: '✏️', kort: '⌨️', rekenen: '🧮', verbinden: '🔗', ordenen: '↕️', tabel: '▦', aanduiden: '📍', getallenas: '📏', markeren: '🖍️', tekenen: '🎨', spreken: '🎙️', open: '💬', papier: '📝', blad: '📄', bron: '📜', sorteren: '🗂️', dictee: '🎧' };

  function alsBron(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve({ naam: file.name, mimeType: file.type, size: file.size, data: r.result.split(',')[1] });
      r.onerror = () => reject(new Error('Kon het bestand niet lezen.'));
      r.readAsDataURL(file);
    });
  }
  async function bladenUit(lijst, voortgang) {
    const out = [];
    for (const b of lijst) {
      if (!/^image\/|^application\/pdf$/.test(b.mimeType)) continue;
      out.push(...await PfBlad.uit(b, (i, n) => voortgang(`${b.naam}: pagina ${i} van ${n}…`)));
    }
    if (!out.length) throw new Error('Voeg eerst je toets toe (pdf, scan of foto).');
    voortgang('');
    return out.length > 1 ? kiesPaginas(out) : out;
  }

  // Welke pagina's neem je over? Een venster met alle pagina's, allemaal aangevinkt.
  function kiesPaginas(bladen) {
    return new Promise((resolve, reject) => {
      const box = document.createElement('div');
      box.className = 'ob-modal';
      box.innerHTML = `<div class="ob-modal-box pf-paginas">
        <div class="bar"><h2>Welke pagina's neem je over?</h2></div>
        <label class="inline check"><input type="checkbox" class="alle" checked> Alles (<span class="tel">${bladen.length}</span> van ${bladen.length})</label>
        <div class="pf-pag-grid">${bladen.map((b, i) => `<label class="pf-pag"><img src="${b.beeld}" alt=""><span><input type="checkbox" data-i="${i}" checked> Pagina ${i + 1}</span></label>`).join('')}</div>
        <div class="actions"><button class="secondary terug">Annuleren</button><button class="gold ok">Neem over</button></div></div>`;
      document.body.appendChild(box);
      const vinkjes = [...box.querySelectorAll('input[data-i]')];
      const tel = () => { const n = vinkjes.filter(v => v.checked).length; box.querySelector('.tel').textContent = n; box.querySelector('.alle').checked = n === vinkjes.length; box.querySelector('.ok').disabled = !n; };
      box.addEventListener('change', e => {
        if (e.target.classList.contains('alle')) for (const v of vinkjes) v.checked = e.target.checked;
        tel();
      });
      box.querySelector('.terug').addEventListener('click', () => { box.remove(); reject(new Error('Je koos geen pagina\'s.')); });
      box.querySelector('.ok').addEventListener('click', () => { box.remove(); resolve(bladen.filter((_, i) => vinkjes[i].checked)); });
    });
  }
  const DEFAULT_VRAAG = {
    meerkeuze: '', juistfout: '', invullen: 'Vul aan.', kort: '', rekenen: '', verbinden: 'Verbind wat bij elkaar hoort.',
    ordenen: 'Zet in de juiste volgorde.', sorteren: 'Sleep elk woord naar de juiste kolom.', dictee: 'Schrijf wat je hoort.', tabel: 'Vul de tabel aan.', aanduiden: '', open: '', papier: '',
    getallenas: 'Duid aan op de getallenas.', markeren: 'Duid alle werkwoorden aan.', tekenen: '', spreken: '',
  };
  const HELP = {
    invullen: 'Zet wat de leerling typt tussen [ en ]. Meerdere goede antwoorden: [fiets|velo]. Een keuzelijstje: {juist|fout|fout}, het eerste is het juiste (de leerling ziet ze alfabetisch).',
    getallenas: 'Kies het begin, het einde en de stap tussen de streepjes. Het juiste getal moet op een streepje liggen. Breuken mag je typen als 3/4.',
    markeren: 'Typ of plak de tekst en klik de juiste woorden, zinnen of stukken aan (ze komen tussen [ en ]). Een fout aangeduid stuk kost een juist.',
    tekenen: 'De leerling tekent met vinger, pen of muis, eventueel op een afbeelding (bv. een rooster, kaart of figuur). Na de toets geef jij de punten.',
    spreken: 'De leerling neemt zijn antwoord op. Na de toets luister je en geef jij de punten. Opnemen lukt op Chromebooks alleen als ICT het adres van LANcelot toelaat; op de pc zelf altijd.',
    kort: 'Meerdere goede antwoorden: scheid ze met |. Getallen tellen ook in een andere schrijfwijze (0,5 = ½ = 1/2). Met een breukvak typt de leerling de teller en de noemer apart; 6/8 is dan ook juist voor 3/4, tenzij je "zo eenvoudig mogelijk" aanvinkt.',
    rekenen: 'De leerling rekent de bewerking uit (in een rekenrooster of een tekstvak) en schrijft de uitkomst. De computer verbetert de uitkomst, jij de bewerking.',
    verbinden: 'Eén paar per regel: links = rechts. De rechterkant komt door elkaar.',
    ordenen: 'Zet de kaartjes in de juiste volgorde (met de pijltjes). Een kaartje is tekst, een prent of allebei. De leerling krijgt ze door elkaar.',
    dictee: 'Typ de woorden of zinnen die de computer voorleest: de leerling hoort ze en ziet ze niet. Bij een woord kan je er een zin bij zetten (die wordt ook voorgelezen). Een ontbrekend, fout of extra woord is één fout.',
    sorteren: 'Geef elke kolom een naam en de woorden die erin horen. Woorden die nergens horen, blijven liggen. De leerling krijgt alle woorden door elkaar; de volgorde in een kolom maakt niet uit.',
    tabel: 'Eén rij per regel, cellen gescheiden door |. De eerste regel is de kop. Zet wat de leerling invult tussen [ ], bv. 2 | [2000]. Een keuzelijstje in een cel: {groter|kleiner|gelijk}, het eerste is het juiste.',
    aanduiden: 'Kies een afbeelding en klik waar het juiste antwoord ligt. Klik op een cirkel om hem weg te halen. Geef je de plekken een naam (bv. de provincies op een kaart), dan zet de leerling elke naam op de juiste plek.',
    open: 'Jij verbetert deze vraag na de toets. Het modelantwoord helpt je (en de AI) snel verbeteren.',
    papier: 'De leerling maakt deze opdracht op papier. Na de toets geef jij de punten.',
    bron: 'Een leestekst, tabel of prent links, met de deelvragen a, b, c rechts ervan.',
    blad: 'De leerling ziet dit blad zoals het in je pdf staat en typt in de vakjes. Klik op het blad om vakjes te verschuiven, bij te maken of weg te halen en de antwoorden in te vullen.',
  };


  function beeldRij(houder, waarde, opts = {}) {
    const rij = document.createElement('div');
    rij.className = 'pf-beeld-rij';
    houder.pfBeeld = waarde || '';
    const teken = () => {
      const b = houder.pfBeeld;
      rij.innerHTML = `${b && !b.startsWith('#') ? `<img src="${b}" alt="">` : ''}
        <button type="button" class="secondary small-btn knip">✂ Knip uit pdf${opts.pagina ? ` (p. ${opts.pagina})` : ''}</button>
        <label class="file-button secondary small-btn">📎 Afbeelding<input type="file" accept="image/*" hidden></label>
        ${b ? '<button type="button" class="secondary small-btn weg" title="Afbeelding weghalen">✕</button>' : ''}
        ${opts.nodig && !b ? `<span class="pf-nodig">🖼 ${esc(opts.nodig)}</span>` : ''}`;
      rij.querySelector('.knip').addEventListener('click', async () => {
        const url = await PfKnip.open({ titel: opts.nodig ? `Knip: ${opts.nodig}` : 'Knip een afbeelding', pagina: opts.pagina });
        if (url) zet(url);
      });
      rij.querySelector('input').addEventListener('change', async e => {
        const f = e.target.files[0];
        if (!f) return;
        try { zet(await PfKnip.verklein(f)); } catch (err) { Ui.melding(err.message); }
      });
      const weg = rij.querySelector('.weg');
      if (weg) weg.addEventListener('click', () => zet(''));
    };
    const zet = url => {
      houder.pfBeeld = url;
      if (url) { opts.nodig = ''; opts.pagina = 0; }
      teken();
      if (opts.onChange) opts.onChange(url);
      cfg.preview();
    };
    teken();
    return rij;
  }

  // Audio bij een vraag: eigen opname of een geluidsbestand. Eerst alleen een klein knopje, zo blijft de kaart rustig.
  function audioRij(houder, waarde) {
    const rij = document.createElement('div');
    rij.className = 'pf-audio-rij';
    houder.pfAudio = waarde || '';
    const open = () => {
      rij.innerHTML = '<span class="small">🎧 Uitleg om te beluisteren:</span> <span class="pf-audio-knop"></span>';
      PfAudio.knop(rij.querySelector('.pf-audio-knop'), { waarde: houder.pfAudio, max: 90, grootte: PfKern.MAX_AUDIO, onChange: d => { houder.pfAudio = d; if (!d) dicht(); cfg.preview(); } });
    };
    const dicht = () => {
      rij.innerHTML = '<button type="button" class="link small pf-audio-open">🎧 Audio toevoegen (bv. de vraag voorlezen)</button>';
      rij.querySelector('button').addEventListener('click', open);
    };
    if (houder.pfAudio) open(); else dicht();
    return rij;
  }

  function optieRij(o, juist) {
    const rij = document.createElement('div');
    rij.className = 'pf-optie';
    const tekst = typeof o === 'string' ? o : (o && o.tekst) || '';
    rij.innerHTML = `<label class="pf-juist" title="Juist antwoord"><input type="checkbox"${juist ? ' checked' : ''}> juist</label>
      <input class="pf-optie-tekst" maxlength="300" placeholder="keuze">
      <span class="pf-optie-beeld"></span>
      <button type="button" class="secondary small-btn weg" title="Keuze weghalen">✕</button>`;
    rij.querySelector('.pf-optie-tekst').value = tekst;
    rij.querySelector('.pf-optie-beeld').appendChild(beeldRij(rij, o && typeof o === 'object' ? o.beeld : ''));
    rij.querySelector('.weg').addEventListener('click', () => { rij.remove(); cfg.preview(); });
    return rij;
  }

  // Een knop die het geselecteerde woord tussen [ ] of { } zet (bij een keuzelijstje met plaats voor foute keuzes).
  function gatKnoppen(box, ta) {
    for (const b of box.querySelectorAll('button[data-in]')) {
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', () => {
        const [l, r] = b.dataset.in;
        const { selectionStart: a, selectionEnd: z, value } = ta;
        const woord = value.slice(a, z).trim() || 'juist';
        const extra = l === '{' ? '|fout|fout' : '';
        ta.value = `${value.slice(0, a)}${l}${woord}${extra}${r}${value.slice(z)}`;
        ta.focus();
        const start = a + 1 + woord.length + 1;
        if (extra) ta.setSelectionRange(start, start + 4); else ta.setSelectionRange(a + woord.length + 2, a + woord.length + 2);
        cfg.preview();
      });
    }
  }

  // De verhouding van een afbeelding (hoogte / breedte), voor het tekenvak erop.
  function meetBeeld(card, url) {
    if (!url) { card.pfVerhouding = Number((card.querySelector('.e-hoogte') || {}).value) || 0.6; return cfg.preview(); }
    const img = new Image();
    img.onload = () => { card.pfVerhouding = Math.round((img.naturalHeight / img.naturalWidth) * 1000) / 1000; cfg.preview(); };
    img.src = url;
  }

  function vraagKaart(q, inBron) {
    const card = document.createElement('div');
    card.className = `panel pf-kaart-edit${q.type === 'bron' ? ' bron' : ''}`;
    card.dataset.type = q.type;
    card.innerHTML = `<div class="ob-edit-head"><strong><span class="pf-k-nr"></span> ${TYPE_ICONS[q.type] || '📜'} ${PfKern.NAMES[q.type]}</strong>
        <div class="actions"><button class="secondary up" title="Omhoog">▲</button><button class="secondary down" title="Omlaag">▼</button><button class="secondary del" title="Verwijderen">✕</button></div></div>`;
    const body = document.createElement('div');
    body.className = 'pf-k-body';
    card.appendChild(body);
    const veld = (html, cls) => {
      const d = document.createElement('div');
      d.className = cls || '';
      d.innerHTML = html;
      body.appendChild(d);
      return d;
    };
    if (q.type === 'blad') bladKaart(card, body, q);
    else if (q.type === 'bron') {
      veld('<label>Titel van de bron<input class="e-titel" maxlength="120" placeholder="bijv. Het verhaal van de Leie"></label>');
      veld('<label>Tekst of gegevens<textarea class="e-tekst" rows="5" placeholder="De leestekst, of gegevens waar de deelvragen over gaan."></textarea></label>');
      card.querySelector('.e-titel').value = q.titel || '';
      card.querySelector('.e-tekst').value = q.tekst || '';
      card.querySelector('.e-tekst').addEventListener('input', () => { for (const d of card.querySelectorAll('.pf-deelvragen > .pf-kaart-edit')) if (d.pfBronVeranderd) d.pfBronVeranderd(); });
      body.appendChild(beeldRij(card, q.beeld, { nodig: q.beeldNodig, pagina: q.beeldPagina }));
      veld(`<p class="muted small">${HELP.bron}</p>`);
      const deel = document.createElement('div');
      deel.className = 'pf-deelvragen';
      for (const d of q.vragen || []) deel.appendChild(vraagKaart(d, true));
      body.appendChild(deel);
      const add = veld('<strong>Deelvraag toevoegen:</strong> ', 'actions pf-deel-add');
      for (const t of PfKern.TYPES.filter(x => x !== 'bron' && x !== 'blad')) {
        const b = document.createElement('button');
        b.className = 'secondary small-btn';
        b.textContent = `+ ${PfKern.NAMES[t]}`;
        b.addEventListener('click', () => { deel.appendChild(vraagKaart({ type: t, vraag: DEFAULT_VRAAG[t] }, true)); cfg.preview(); });
        add.appendChild(b);
      }
    } else {
      veld(`<label>${q.type === 'invullen' || q.type === 'tabel' ? 'Opdracht' : 'Vraag'}<textarea class="e-vraag" rows="2" maxlength="1500"></textarea></label>`);
      card.querySelector('.e-vraag').value = q.vraag ?? DEFAULT_VRAAG[q.type] ?? '';
      body.appendChild(audioRij(card, q.audio));
      // Een tekst die de computer voorleest (🎧 en 🐢 trager). De leerling hoort ze, maar ziet ze niet.
      if (q.type !== 'dictee') {
        const zeg = veld('<details class="pf-e-zeg"><summary class="small">🎧 Laten voorlezen door de computer</summary><label>Tekst om voor te lezen (de leerling hoort ze, maar ziet ze niet)<textarea class="e-voorlees" rows="2" maxlength="1000" placeholder="bijv. Luister goed: welk woord hoor je?"></textarea></label></details>');
        zeg.querySelector('.e-voorlees').value = q.voorlees || '';
        zeg.querySelector('details').open = !!q.voorlees;
      }
      if (!['aanduiden', 'tekenen', 'markeren', 'getallenas', 'spreken'].includes(q.type)) body.appendChild(beeldRij(card, q.beeld, { nodig: q.beeldNodig, pagina: q.beeldPagina }));
      if (q.type === 'meerkeuze') {
        const box = veld('', 'pf-opties');
        const juist = new Set([].concat(q.juist ?? 0));
        for (const [i, o] of (q.opties && q.opties.length ? q.opties : ['', '', '']).entries()) box.appendChild(optieRij(o, juist.has(i)));
        const add = veld('<button type="button" class="secondary small-btn">+ keuze</button><span class="muted small"> Vink alle juiste antwoorden aan. Meer dan één: de leerling moet ze allemaal aanduiden.</span>');
        add.querySelector('button').addEventListener('click', () => { box.appendChild(optieRij('', false)); meer(); cfg.preview(); });
        // Meerdere juiste: alles of niets, of punten per juist antwoord; en eventueel "duid er 2 aan".
        const meerBox = veld(`<div class="row"><label>Punten<select class="e-puntenper"><option value="">alles of niets</option><option value="juist">per juist antwoord (een fout kost er één)</option></select></label>
          <label>Hoeveel moet de leerling aanduiden?<input class="e-aantal" type="number" min="1" max="7" placeholder="allemaal"></label></div>`, 'pf-e-meer');
        meerBox.querySelector('.e-puntenper').value = q.puntenPer || '';
        meerBox.querySelector('.e-aantal').value = q.aantal || '';
        const meer = () => meerBox.classList.toggle('hidden', [...box.querySelectorAll('.pf-juist input')].filter(i => i.checked).length < 2);
        box.addEventListener('change', meer);
        meer();
      } else if (q.type === 'juistfout') {
        veld('<label>Het juiste antwoord<select class="e-jf"><option value="J">Juist</option><option value="F">Fout</option></select></label>');
        card.querySelector('.e-jf').value = q.juist ? 'J' : 'F';
      } else if (q.type === 'invullen') {
        veld('<label>Tekst met gaten<textarea class="e-tekst" rows="3" placeholder="De hoofdstad van België is [Brussel]. Een spin heeft {acht|zes|tien} poten."></textarea></label>');
        card.querySelector('.e-tekst').value = q.tekst || '';
        const hulp = veld('<button type="button" class="secondary small-btn" data-in="[]">+ Gat om te typen</button> <button type="button" class="secondary small-btn" data-in="{}">+ Keuzelijstje</button> <span class="muted small">Selecteer eerst het juiste woord in de tekst.</span>', 'actions');
        gatKnoppen(hulp, card.querySelector('.e-tekst'));
        veld('<label class="inline check"><input type="checkbox" class="e-bank"> 🧲 Woordenbank: de leerling sleept de woorden in de gaten</label><label class="e-extra-label">Extra woorden in de bank (foute keuzes, gescheiden door /)<input class="e-extra" maxlength="600" placeholder="bijv. hond / tafel"></label>');
        card.querySelector('.e-bank').checked = !!q.bank;
        card.querySelector('.e-extra').value = (q.extra || []).join(' / ');
        const bk = () => card.querySelector('.e-extra-label').classList.toggle('hidden', !card.querySelector('.e-bank').checked);
        card.querySelector('.e-bank').addEventListener('change', bk);
        bk();
      } else if (q.type === 'kort' || q.type === 'rekenen') {
        veld(`<div class="row"><label>${q.type === 'rekenen' ? 'Uitkomst' : 'Juist antwoord'}<input class="e-antwoord" maxlength="300" placeholder="bijv. 0,5|1/2"></label><label>Eenheid (mag leeg)<input class="e-eenheid" maxlength="20" placeholder="bijv. cm"></label>${q.type === 'rekenen' ? '<label>Punten bewerking<input class="e-werkpunten" type="number" min="0" max="100" step="0.5"></label>' : ''}</div>`);
        card.querySelector('.e-antwoord').value = q.antwoord || '';
        card.querySelector('.e-eenheid').value = q.eenheid || '';
        if (q.type === 'rekenen') card.querySelector('.e-werkpunten').value = q.werkPunten ?? 1;
        veld(`<label class="inline check"><input type="checkbox" class="e-breuk"> Antwoord in een breukvak (teller boven, noemer onder)</label> <label class="inline check" title="3/4 is juist, 6/8 niet. Een onechte breuk (7/4) moet een gemengd getal zijn (1 3/4), tenzij je juiste antwoord zelf een onechte breuk is."><input type="checkbox" class="e-vv"> Zo eenvoudig mogelijk (3/4 juist, 6/8 fout)</label>${q.type === 'rekenen' ? ' <label class="inline check"><input type="checkbox" class="e-rooster"> Bewerking in een rekenrooster (hokjes)</label>' : ''}`, 'pf-checks');
        card.querySelector('.e-breuk').checked = !!q.breuk;
        card.querySelector('.e-vv').checked = !!q.vereenvoudigd;
        if (q.type === 'rekenen') {
          // Een nieuwe rekenvraag krijgt meteen een rooster; een oude houdt zijn tekstvak tot je het aanvinkt.
          card.querySelector('.e-rooster').checked = q.rooster === true || (q.rooster === undefined && !q.antwoord);
          card.pfRooster = { kol: q.kol, rij: q.rij };
        }
      } else if (q.type === 'verbinden') {
        veld('<label>Paren<textarea class="e-lijst" rows="4" placeholder="Antwerpen = Schelde\nLuik = Maas"></textarea></label>');
        card.querySelector('.e-lijst').value = (q.paren || []).map(p => `${p[0]} = ${p[1]}`).join('\n');
      } else if (q.type === 'ordenen') {
        // Een kaartje per rij: tekst en/of een prent, in de juiste volgorde.
        veld('<strong>In de juiste volgorde</strong>');
        const box = veld('', 'pf-opties pf-e-orden');
        const rij = it => {
          const r = optieRij(it, false);
          r.querySelector('.pf-juist').outerHTML = '<span class="pf-e-orden-nr"></span><span class="pf-e-orden-knop"><button type="button" class="secondary small-btn op" title="Omhoog">▲</button><button type="button" class="secondary small-btn neer" title="Omlaag">▼</button></span>';
          r.querySelector('.pf-optie-tekst').placeholder = 'tekst (mag leeg met een prent)';
          r.querySelector('.op').addEventListener('click', () => { if (r.previousElementSibling) box.insertBefore(r, r.previousElementSibling); cfg.preview(); });
          r.querySelector('.neer').addEventListener('click', () => { if (r.nextElementSibling) box.insertBefore(r.nextElementSibling, r); cfg.preview(); });
          return r;
        };
        for (const it of q.items && q.items.length ? q.items : ['', '', '']) box.appendChild(rij(it));
        const add = veld('<button type="button" class="secondary small-btn">+ kaartje</button>');
        add.querySelector('button').addEventListener('click', () => { box.appendChild(rij('')); cfg.preview(); });
        veld('<label>Punten<select class="e-puntenper"><option value="">alles juist</option><option value="plaats">per juiste plaats</option></select></label>');
        card.querySelector('.e-puntenper').value = q.puntenPer || '';
      } else if (q.type === 'dictee') {
        // Woorden (met eventueel een zin erbij) of hele zinnen. De computer leest ze voor.
        veld(`<div class="row"><label>Wat schrijft de leerling?<select class="e-vorm"><option value="woorden">Woorden</option><option value="zinnen">Zinnen</option></select></label>
          <label class="e-pz-label">Punten per zin<select class="e-pz"><option value="">1 punt per woord</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}">${n} (elke fout −1, nooit onder 0)</option>`).join('')}</select></label></div>`);
        card.querySelector('.e-vorm').value = q.vorm || 'woorden';
        card.querySelector('.e-pz').value = q.puntenZin || '';
        const box = veld('', 'pf-e-delen');
        const rij = d => {
          const r = document.createElement('div');
          r.className = 'pf-e-deel';
          r.innerHTML = '<input class="e-deel" maxlength="300"><input class="e-deelzin" maxlength="300" placeholder="zin erbij (mag leeg), bv. Ik fiets naar school."><button type="button" class="secondary small-btn weg" title="Weghalen">✕</button>';
          r.querySelector('.e-deel').value = (d && d.tekst) || (typeof d === 'string' ? d : '');
          r.querySelector('.e-deelzin').value = (d && d.zin) || '';
          r.querySelector('.weg').addEventListener('click', () => { if (box.children.length > 1) { r.remove(); cfg.preview(); } });
          return r;
        };
        for (const d of q.delen && q.delen.length ? q.delen : [{}, {}]) box.appendChild(rij(d));
        const add = veld('<button type="button" class="secondary small-btn e-deel-add"></button>');
        add.querySelector('button').addEventListener('click', () => { if (box.children.length < PfKern.MAX_DICTEE) { box.appendChild(rij({})); vorm(); cfg.preview(); } });
        veld('<label class="inline check"><input type="checkbox" class="e-hoofd"> Hoofdletters tellen mee</label> <label class="inline check"><input type="checkbox" class="e-lees"> Leestekens tellen mee</label>');
        card.querySelector('.e-hoofd').checked = q.hoofdletters !== false;
        card.querySelector('.e-lees').checked = !!q.leestekens;
        const vorm = () => {
          const zinnen = card.querySelector('.e-vorm').value === 'zinnen';
          card.querySelector('.e-pz-label').classList.toggle('hidden', !zinnen);
          add.querySelector('button').textContent = zinnen ? '+ zin' : '+ woord';
          for (const r of box.children) {
            r.querySelector('.e-deel').placeholder = zinnen ? 'de zin, bv. De kat slaapt op de mat.' : 'het woord, bv. fiets';
            r.querySelector('.e-deelzin').classList.toggle('hidden', zinnen);
          }
        };
        card.querySelector('.e-vorm').addEventListener('change', vorm);
        vorm();
      } else if (q.type === 'sorteren') {
        // De kolommen: een naam en de woorden die erin horen.
        const box = veld('', 'pf-e-kols');
        const kol = k => {
          const r = document.createElement('div');
          r.className = 'pf-e-kol';
          r.innerHTML = `<input class="e-kolnaam" maxlength="60" placeholder="kolom, bv. -tje"><input class="e-kolwoorden" maxlength="1500" placeholder="woorden in deze kolom, gescheiden door /"><button type="button" class="secondary small-btn weg" title="Kolom weghalen">✕</button>`;
          r.querySelector('.e-kolnaam').value = (k && k.naam) || '';
          r.querySelector('.e-kolwoorden').value = ((k && k.woorden) || []).join(' / ');
          r.querySelector('.weg').addEventListener('click', () => { if (box.children.length > 2) { r.remove(); cfg.preview(); } });
          return r;
        };
        for (const k of q.kolommen && q.kolommen.length ? q.kolommen : [{}, {}]) box.appendChild(kol(k));
        const add = veld('<button type="button" class="secondary small-btn">+ kolom</button> <span class="muted small">2 tot 6 kolommen</span>');
        add.querySelector('button').addEventListener('click', () => { if (box.children.length < 6) { box.appendChild(kol({})); cfg.preview(); } });
        veld('<label>Woorden die nergens horen (mag leeg, gescheiden door /)<input class="e-extra" maxlength="600" placeholder="bijv. tafel / stoel"></label>');
        card.querySelector('.e-extra').value = (q.extra || []).join(' / ');
      } else if (q.type === 'tabel') {
        veld('<label>Tabel<textarea class="e-lijst" rows="4" placeholder="kg | g\n2 | [2000]\n[0,5] | 500"></textarea></label>');
        card.querySelector('.e-lijst').value = (q.rijen || []).map(r => r.join(' | ')).join('\n');
      } else if (q.type === 'aanduiden') {
        card.pfZones = (q.zones || []).map(z => ({ ...z }));
        card.pfVerhouding = q.verhouding || 0.75;
        const kaart = veld('', 'pf-zone-edit');
        const straal = veld('<label class="inline">Grootte van de cirkel <input class="e-straal" type="range" min="2" max="20" value="6"></label>');
        const tekenZones = () => {
          const b = card.pfBeeld;
          kaart.innerHTML = b && !b.startsWith('#')
            ? `<div class="pf-kaart edit"><img src="${b}" alt="" draggable="false">${card.pfZones.map((z, i) => `<i class="pf-zone" data-i="${i}" style="left:${z.x}%;top:${z.y}%;width:${z.r * 2}%"><span class="pf-zone-nr">${i + 1}</span></i>`).join('')}</div>
              ${card.pfZones.length ? `<div class="pf-zone-lijst"><span class="muted small">Naam per plek (mag leeg: dan tikt de leerling één plek aan)</span>${card.pfZones.map((z, i) => `<label><b>${i + 1}</b><input class="e-zone-naam" data-i="${i}" maxlength="40" placeholder="bijv. Antwerpen"></label>`).join('')}</div>` : ''}`
            : '<p class="muted small">Kies eerst de afbeelding (knippen uit de pdf of een eigen afbeelding).</p>';
          for (const inp of kaart.querySelectorAll('.e-zone-naam')) {
            inp.value = card.pfZones[Number(inp.dataset.i)].naam || '';
            inp.addEventListener('input', () => { card.pfZones[Number(inp.dataset.i)].naam = inp.value.trim(); cfg.preview(); });
          }
          const k = kaart.querySelector('.pf-kaart');
          if (!k) return;
          const img = k.querySelector('img');
          const meet = () => { if (img.naturalWidth) { card.pfVerhouding = img.naturalHeight / img.naturalWidth; k.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`; } };
          if (img.complete) meet(); else img.addEventListener('load', () => { meet(); cfg.preview(); });
          k.addEventListener('click', e => {
            const zone = e.target.closest('.pf-zone');
            if (zone) card.pfZones.splice(Number(zone.dataset.i), 1);
            else {
              const r = k.getBoundingClientRect();
              card.pfZones.push({ x: Math.round(((e.clientX - r.left) / r.width) * 1000) / 10, y: Math.round(((e.clientY - r.top) / r.height) * 1000) / 10, r: Number(straal.querySelector('input').value) });
            }
            tekenZones();
            cfg.preview();
          });
        };
        body.insertBefore(beeldRij(card, q.beeld, { nodig: q.beeldNodig, pagina: q.beeldPagina, onChange: () => { card.pfZones = []; tekenZones(); } }), kaart);
        straal.querySelector('input').addEventListener('input', e => {
          const last = card.pfZones[card.pfZones.length - 1];
          if (last) { last.r = Number(e.target.value); tekenZones(); cfg.preview(); }
        });
        tekenZones();
      } else if (q.type === 'getallenas') {
        veld(`<div class="row"><label>Begin<input class="e-min" maxlength="20" placeholder="0"></label><label>Einde<input class="e-max" maxlength="20" placeholder="10"></label><label>Stap tussen de streepjes<input class="e-stap" maxlength="20" placeholder="1 of 1/4"></label><label>Juiste getal<input class="e-antwoord" maxlength="20" placeholder="bijv. 3/4"></label></div>
          <div class="row"><label>Getallen bij de streepjes<select class="e-getallen"><option value="rand">Alleen begin en einde</option><option value="alle">Bij elk streepje</option></select></label>
          <label class="inline check"><input type="checkbox" class="e-breuk"> Toon als breuken</label></div>`);
        card.querySelector('.e-min').value = q.min ?? '0';
        card.querySelector('.e-max').value = q.max ?? '10';
        card.querySelector('.e-stap').value = q.stap ?? '1';
        card.querySelector('.e-antwoord').value = q.antwoord ?? '';
        card.querySelector('.e-getallen').value = q.getallen === 'alle' ? 'alle' : 'rand';
        card.querySelector('.e-breuk').checked = !!q.breuk;
      } else if (q.type === 'markeren') {
        markeerEditor(card, body, veld, q, inBron);
      } else if (q.type === 'tekenen') {
        card.pfVerhouding = q.verhouding || 0.6;
        body.appendChild(beeldRij(card, q.beeld, { nodig: q.beeldNodig, pagina: q.beeldPagina, onChange: url => meetBeeld(card, url) }));
        veld('<label class="inline">Hoogte van het tekenvak (zonder afbeelding) <select class="e-hoogte"><option value="0.4">laag</option><option value="0.6">gewoon</option><option value="0.9">hoog</option></select></label>');
        card.querySelector('.e-hoogte').value = [0.4, 0.6, 0.9].includes(q.verhouding) ? String(q.verhouding) : '0.6';
        card.querySelector('.e-hoogte').addEventListener('change', e => { if (!card.pfBeeld) card.pfVerhouding = Number(e.target.value); });
        veld('<label>Waar je op let (voor jou, niet voor de leerling)<textarea class="e-model" rows="2" maxlength="2000"></textarea></label>');
        card.querySelector('.e-model').value = q.model || '';
      } else if (q.type === 'spreken') {
        veld('<label class="inline">Hoe lang mag de leerling spreken? <select class="e-seconden"><option value="30">30 seconden</option><option value="60">1 minuut</option><option value="120">2 minuten</option><option value="180">3 minuten</option></select></label>');
        card.querySelector('.e-seconden').value = String([30, 60, 120, 180].includes(q.seconden) ? q.seconden : 60);
        veld('<label>Waar je op let (voor jou, niet voor de leerling)<textarea class="e-model" rows="2" maxlength="2000"></textarea></label>');
        card.querySelector('.e-model').value = q.model || '';
      } else if (q.type === 'open' || q.type === 'papier') {
        veld('<label>Modelantwoord of waar je op let (voor jou, niet voor de leerling)<textarea class="e-model" rows="2" maxlength="2000"></textarea></label>');
        card.querySelector('.e-model').value = q.model || '';
        if (q.type === 'open') {
          veld('<label class="inline">Regels om te schrijven <input class="e-regels" type="number" min="1" max="12"></label>');
          card.querySelector('.e-regels').value = q.regels || 3;
        }
      }
      const onder = veld(`<label class="inline">${q.type === 'rekenen' ? 'Punten uitkomst' : 'Punten'} <input class="e-punten" type="number" min="0" max="100" step="0.5"></label>
        ${['invullen', 'kort', 'tabel'].includes(q.type) ? '<label class="inline check"><input type="checkbox" class="e-exact"> Hoofdletters en leestekens tellen mee</label>' : ''}`, 'pf-k-onder');
      onder.querySelector('.e-punten').value = q.punten ?? '';
      onder.querySelector('.e-punten').placeholder = 'auto';
      if (onder.querySelector('.e-exact')) onder.querySelector('.e-exact').checked = !!q.exact;
      if (HELP[q.type]) veld(`<p class="muted small">${HELP[q.type]}</p>`);
      body.appendChild(DoelKies.field(q.doel, { onChange: () => cfg.preview() }));
    }
    card.querySelector('.up').addEventListener('click', () => { if (card.previousElementSibling) card.parentNode.insertBefore(card, card.previousElementSibling); cfg.preview(); });
    card.querySelector('.down').addEventListener('click', () => { if (card.nextElementSibling) card.parentNode.insertBefore(card.nextElementSibling, card); cfg.preview(); });
    card.querySelector('.del').addEventListener('click', async () => {
      if ((card.querySelector('.e-vraag') || card.querySelector('.e-tekst') || {}).value && !await Ui.vraag('Deze vraag verwijderen?')) return;
      card.remove();
      cfg.preview();
    });
    // Nog wachten op een afbeelding uit de pdf: dat onthouden tot er een beeld is.
    card.pfNodig = q.beeldNodig || '';
    card.pfPagina = q.beeldPagina || 0;
    if (inBron) card.classList.add('deel');
    return card;
  }

  // Woorden aanduiden: wat de leerling aantikt (woorden, zinnen of stukjes), de kleuren, hoeveel, en in een bron: in de brontekst.
  // De maker klikt de juiste woorden of zinnen aan (of sleept over een stuk); dat zet ze tussen [ ] in de tekst (met |2 voor de tweede kleur).
  const STIFT_NAMEN = Object.keys(PfKern.STIFTEN);
  function markeerEditor(card, body, veld, q, inBron) {
    card.pfKleuren = (q.kleuren || []).map(c => ({ ...c }));
    card.pfDoelen = (q.doelen || []).map(d => d.slice());
    let kleur = 1;
    let begin = null;
    const opties = veld(`<div class="row"><label>Wat tikt de leerling aan?<select class="e-per"><option value="">Woorden</option><option value="zin">Zinnen</option><option value="stuk">Stukjes tekst</option></select></label>
      <label>Hoeveel moet de leerling aanduiden?<input class="e-aantal" type="number" min="1" max="99" placeholder="allemaal"></label></div>
      ${inBron ? '<label class="inline check"><input type="checkbox" class="e-inbron"> 👈 Duid aan in de brontekst (de leerling duidt aan in de tekst links)</label>' : ''}`);
    opties.querySelector('.e-per').value = q.per || '';
    opties.querySelector('.e-aantal').value = q.aantal || '';
    const inb = opties.querySelector('.e-inbron');
    if (inb) inb.checked = !!q.inBron;
    const kleurBox = veld('', 'pf-e-kleuren');
    const tekstVeld = veld('<label>Tekst<textarea class="e-tekst" rows="4" placeholder="De hond [blaft] en de kat [slaapt]."></textarea></label>');
    const ta = tekstVeld.querySelector('.e-tekst');
    ta.value = q.tekst || '';
    const klik = veld('', 'pf-e-markeer');
    const bronKaart = () => card.parentElement && card.parentElement.closest('.pf-kaart-edit.bron');
    const bronTekst = () => { const b = bronKaart(); const t = b && b.querySelector(':scope > .pf-k-body .e-tekst'); return t ? t.value : ''; };
    const inBronAan = () => !!(inb && inb.checked);
    const per = () => opties.querySelector('.e-per').value;
    const hexen = () => (card.pfKleuren.length ? card.pfKleuren.map(c => PfKern.STIFTEN[c.kleur]) : [PfKern.STIFTEN.geel]);
    // De juiste stukken als [eerste woord, laatste woord, kleur] in de woorden van de tekst (zonder haken).
    const model = () => {
      if (inBronAan()) {
        const plain = bronTekst();
        const woorden = PfKern.tekstWoorden(plain);
        return { plain, woorden, doelen: card.pfDoelen.filter(d => d[1] < woorden.length).map(d => ({ a: d[0], b: d[1], k: d[2] })) };
      }
      const z = PfKern.zonderHaken(ta.value);
      const woorden = PfKern.tekstWoorden(z.plain);
      const doelen = z.doelen.map(d => {
        const binnen = woorden.map((x, i) => (x.s < d.e && x.e > d.s ? i : -1)).filter(i => i >= 0);
        return binnen.length ? { a: binnen[0], b: binnen[binnen.length - 1], k: d.k } : null;
      }).filter(Boolean);
      return { plain: z.plain, woorden, doelen };
    };
    // Terug naar de tekst met haken (of naar de doelen in de bron).
    const bewaar = (m, doelen) => {
      doelen.sort((x, y) => x.a - y.a);
      if (inBronAan()) card.pfDoelen = doelen.map(d => [d.a, d.b, d.k, m.woorden.slice(d.a, d.b + 1).map(x => x.t).join(' ')]);
      else {
        let out = '';
        let last = 0;
        for (const d of doelen) {
          const s = m.woorden[d.a].s;
          let e = m.woorden[d.b].e;
          // Een zin: het leesteken erachter hoort erbij.
          if (per() === 'zin') { const r = /^[.!?…]*["'”’»)]*/.exec(m.plain.slice(e)); e += r[0].length; }
          if (s < last) continue;
          out += `${m.plain.slice(last, s)}[${m.plain.slice(s, e)}${d.k > 1 ? `|${d.k}` : ''}]`;
          last = e;
        }
        ta.value = out + m.plain.slice(last);
      }
      teken();
      cfg.preview();
    };
    const wissel = (a, b) => {
      const m = model();
      const raak = m.doelen.filter(d => d.a <= b && d.b >= a);
      const rest = m.doelen.filter(d => !raak.includes(d));
      // Hetzelfde nog eens aanklikken met dezelfde kleur haalt het weg; met een andere kleur krijgt het die kleur.
      const weg = per() === 'stuk' ? raak.length === 1 && raak[0].a === a && raak[0].b === b && raak[0].k === kleur : raak.length && raak.every(d => d.k === kleur);
      bewaar(m, weg ? rest : [...rest, { a, b, k: kleur }]);
    };
    const tekenKleuren = () => {
      kleurBox.innerHTML = `<div class="pf-e-kleur-kop"><strong>Kleuren</strong> <span class="muted small">${card.pfKleuren.length ? 'Kies een kleur en klik dan de juiste woorden aan.' : 'Eén kleur. Meer kleuren? Bv. groen = eigennaam, geel = zelfstandig naamwoord.'}</span></div>
        ${card.pfKleuren.map((c, i) => `<div class="pf-e-kleur" data-i="${i}"><button type="button" class="pf-stift${kleur === i + 1 ? ' on' : ''}" data-k="${i + 1}" style="--stift:${PfKern.STIFTEN[c.kleur]}" title="Met deze kleur aanklikken"><i></i>${i + 1}</button>
          <select class="e-kleur">${STIFT_NAMEN.map(n => `<option value="${n}"${n === c.kleur ? ' selected' : ''}>${n}</option>`).join('')}</select>
          <input class="e-uitleg" maxlength="60" placeholder="uitleg, bv. eigennaam" value="${esc(c.uitleg || '')}">
          <button type="button" class="secondary small-btn weg" title="Kleur weghalen">✕</button></div>`).join('')}
        ${card.pfKleuren.length < 4 ? `<button type="button" class="secondary small-btn e-kleur-bij">${card.pfKleuren.length ? '+ Nog een kleur' : '+ Meer kleuren'}</button>` : ''}`;
      for (const r of kleurBox.querySelectorAll('.pf-e-kleur')) {
        const i = Number(r.dataset.i);
        r.querySelector('.pf-stift').addEventListener('click', () => { kleur = i + 1; tekenKleuren(); teken(); });
        r.querySelector('.e-kleur').addEventListener('change', e => { card.pfKleuren[i].kleur = e.target.value; tekenKleuren(); teken(); cfg.preview(); });
        r.querySelector('.e-uitleg').addEventListener('input', e => { card.pfKleuren[i].uitleg = e.target.value; cfg.preview(); });
        r.querySelector('.weg').addEventListener('click', () => {
          // De woorden in deze kleur gaan terug naar de eerste kleur, de kleuren erna schuiven op.
          const m = model();
          const doelen = m.doelen.map(d => ({ ...d, k: d.k === i + 1 ? 1 : d.k > i + 1 ? d.k - 1 : d.k }));
          card.pfKleuren.splice(i, 1);
          if (card.pfKleuren.length === 1) card.pfKleuren = [];
          kleur = 1;
          tekenKleuren();
          bewaar(m, doelen);
        });
      }
      const bij = kleurBox.querySelector('.e-kleur-bij');
      if (bij) bij.addEventListener('click', () => {
        const vrij = STIFT_NAMEN.filter(n => !card.pfKleuren.some(c => c.kleur === n));
        if (!card.pfKleuren.length) card.pfKleuren.push({ kleur: 'geel', uitleg: '' });
        card.pfKleuren.push({ kleur: vrij.find(n => n !== 'geel') || 'groen', uitleg: '' });
        kleur = card.pfKleuren.length;
        tekenKleuren();
        teken();
        cfg.preview();
      });
    };
    // De tekst om aan te klikken, met de juiste stukken in hun kleur.
    const teken = () => {
      tekstVeld.classList.toggle('hidden', inBronAan());
      const m = model();
      const hex = hexen();
      const kz = new Map();
      const kw = new Map();
      for (const d of m.doelen) for (let i = d.a; i <= d.b; i++) kw.set(i, d.k);
      if (per() === 'zin') for (const d of m.doelen) for (let i = d.a; i <= d.b; i++) kz.set(m.woorden[i].z, d.k);
      const kleurVan = (w, x) => (per() === 'zin' ? kz.get(x.z) : kw.get(w));
      let h = '';
      let last = 0;
      m.woorden.forEach((x, w) => {
        const tus = m.plain.slice(last, x.s);
        const vorige = w ? kleurVan(w - 1, m.woorden[w - 1]) : 0;
        const k = kleurVan(w, x);
        const tusKleur = vorige && vorige === k && (per() === 'zin' ? m.woorden[w - 1].z === x.z : per() === 'stuk' && m.doelen.some(d => d.a < w && d.b >= w));
        h += tusKleur ? `<span style="background:${hex[k - 1]}">${esc(tus).replace(/\n/g, '<br>')}</span>` : esc(tus).replace(/\n/g, '<br>');
        h += `<span class="pf-woord${begin === w ? ' start' : ''}" data-w="${w}" data-z="${x.z}"${k ? ` style="background:${hex[k - 1] || hex[0]};color:#1d1d1f"` : ''}>${esc(x.t)}</span>`;
        last = x.e;
      });
      h += esc(m.plain.slice(last)).replace(/\n/g, '<br>');
      const wat = inBronAan()
        ? { zin: 'Klik in de brontekst de juiste zin(nen) aan.', stuk: 'Sleep in de brontekst over het juiste stuk (of klik het eerste en dan het laatste woord).' }[per()] || 'Klik in de brontekst de juiste woorden aan.'
        : { zin: 'Klik de juiste zin(nen) aan.', stuk: 'Sleep over het juiste stuk (of klik het eerste en dan het laatste woord).' }[per()] || 'Klik de juiste woorden aan.';
      klik.innerHTML = m.woorden.length ? `<p class="muted small">✏️ <span>${wat}</span> <span>Nog eens klikken haalt het weg.</span></p><div class="pf-markeer pf-e-klik">${h}</div>`
        : `<p class="muted small">${inBronAan() ? 'Typ eerst de tekst van de bron.' : 'Typ of plak eerst de tekst.'}</p>`;
    };
    let sleep = null;
    let gesleept = false;
    klik.addEventListener('pointerdown', e => { gesleept = false; const w = e.target.closest('.pf-woord'); if (w && per() === 'stuk' && e.pointerType !== 'touch') { sleep = Number(w.dataset.w); e.preventDefault(); } });
    klik.addEventListener('pointerup', e => {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      const w = t && t.closest && t.closest('.pf-woord');
      if (sleep !== null && w && Number(w.dataset.w) !== sleep) { gesleept = true; begin = null; wissel(Math.min(sleep, Number(w.dataset.w)), Math.max(sleep, Number(w.dataset.w))); }
      sleep = null;
    });
    klik.addEventListener('click', e => {
      if (gesleept) { gesleept = false; return; }
      const el = e.target.closest('.pf-woord');
      if (!el) return;
      const w = Number(el.dataset.w);
      const m = model();
      if (per() === 'zin') {
        const z = Number(el.dataset.z);
        const ws = m.woorden.map((x, i) => (x.z === z ? i : -1)).filter(i => i >= 0);
        return wissel(ws[0], ws[ws.length - 1]);
      }
      if (per() === 'stuk') {
        const in1 = m.doelen.find(d => w >= d.a && w <= d.b);
        if (begin === null && in1 && in1.k === kleur) return bewaar(m, m.doelen.filter(d => d !== in1));
        if (begin === null) { begin = w; return teken(); }
        const a = Math.min(begin, w);
        const b = Math.max(begin, w);
        begin = null;
        return wissel(a, b);
      }
      wissel(w, w);
    });
    ta.addEventListener('input', teken);
    opties.querySelector('.e-per').addEventListener('change', () => { begin = null; teken(); cfg.preview(); });
    if (inb) inb.addEventListener('change', () => {
      // Naar de brontekst: wat al in de eigen tekst stond, valt weg (de tekst blijft bewaard tot je hem uitvinkt).
      teken();
      cfg.preview();
    });
    // Verandert de tekst van de bron, dan zoeken we de juiste stukken terug.
    card.pfBronVeranderd = () => { if (inBronAan()) { card.pfDoelen = PfKern.doelenInBron(card.pfDoelen, bronTekst()); teken(); } };
    tekenKleuren();
    // De kaart staat pas na het maken in de bron: dan pas kennen we de brontekst.
    setTimeout(teken, 0);
    teken();
  }

  // Een blad uit de pdf: een kleine weergave met de vakjes, en een knop om ze te plaatsen en de antwoorden in te vullen.
  function bladKaart(card, body, q) {
    card.pfBeeld = q.beeld;
    card.pfBlad = { verhouding: q.verhouding, velden: (q.velden || []).map(f => JSON.parse(JSON.stringify(f))), woorden: q.woorden || [], schaal: q.schaal || PfKern.SCHAAL };
    const vak = document.createElement('div');
    vak.className = 'pf-blad-kaart';
    body.appendChild(vak);
    const teken = () => {
      const velden = card.pfBlad.velden;
      const leeg = velden.filter(PfBlad.leegVeld).length;
      // Wat de leerkracht zelf verbetert; een vakje met 0 punten (of kladruimte) telt niet.
      const hand = velden.filter(f => PfKern.handVeld(f)).reduce((s, f) => s + (Number(f.punten) || 0), 0);
      vak.innerHTML = `<button type="button" class="pf-blad-mini" title="Vakjes plaatsen en antwoorden invullen" style="aspect-ratio:${1 / (card.pfBlad.verhouding || 1.414)}">
          <img src="${card.pfBeeld}" alt="">${velden.map(f => `<i class="${f.soort}${PfBlad.leegVeld(f) ? ' zonder' : ''}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%"></i>`).join('')}</button>
        <div class="pf-blad-info"><p><strong>${velden.length} vakjes</strong> · ${nl(velden.filter(f => !PfKern.handVeld(f)).reduce((s, f) => s + (Number(f.punten) || 0), 0))} punten${hand ? ` + ${nl(hand)} ${hand === 1 ? 'punt' : 'punten'} die jij verbetert (open vakjes, tekenvakken of rekenroosters zonder sleutel)` : ''}</p>
          ${leeg ? `<p class="pf-nodig">⚠ ${leeg} ${leeg === 1 ? 'vakje heeft' : 'vakjes hebben'} nog geen antwoord</p>` : velden.length ? '<p class="muted small">Alle antwoorden staan erin.</p>' : '<p class="pf-nodig">⚠ Nog geen vakjes</p>'}
          <button type="button" class="secondary small-btn bewerk">✏️ Vakjes en antwoorden</button></div>`;
      for (const b of vak.querySelectorAll('.pf-blad-mini, .bewerk')) b.addEventListener('click', bewerk);
    };
    const bewerk = async () => {
      const nr = card.querySelector('.pf-k-nr').textContent;
      const velden = await PfBlad.bewerk({ beeld: card.pfBeeld, verhouding: card.pfBlad.verhouding, velden: card.pfBlad.velden, woorden: card.pfBlad.woorden, schaal: card.pfBlad.schaal }, {
        titel: `Blad ${nr}`, nr, niveau: cfg.niveau(), ai: cfg.ai(),
      });
      if (!velden) return;
      card.pfBlad.velden = velden;
      card.pfBlad.woorden = velden.woorden || [];
      card.pfBlad.schaal = velden.schaal || PfKern.SCHAAL;
      teken();
      cfg.preview();
    };
    card.pfBewerk = bewerk;
    card.pfTeken = teken;
    teken();
    const v = document.createElement('div');
    v.innerHTML = `<p class="muted small">${HELP.blad}</p>`;
    body.appendChild(v);
  }


  const waarde = (card, sel) => { const el = card.querySelector(`:scope > .pf-k-body ${sel}`); return el ? el.value : ''; };

  function leesKaart(card) {
    const type = card.dataset.type;
    const q = { type };
    if (card.pfBeeld) q.beeld = card.pfBeeld;
    else {
      if (card.pfNodig) q.beeldNodig = card.pfNodig;
      if (card.pfPagina) q.beeldPagina = card.pfPagina;
    }
    const doel = card.querySelector(':scope > .pf-k-body > .doel-veld');
    if (doel && DoelKies.read(doel)) q.doel = DoelKies.read(doel);
    if (type === 'blad') {
      q.beeld = card.pfBeeld;
      q.verhouding = card.pfBlad.verhouding;
      q.velden = card.pfBlad.velden;
      if (card.pfBlad.woorden && card.pfBlad.woorden.length) q.woorden = card.pfBlad.woorden;
      if (card.pfBlad.schaal && card.pfBlad.schaal !== PfKern.SCHAAL) q.schaal = card.pfBlad.schaal;
      return q;
    }
    if (type === 'bron') {
      q.titel = waarde(card, '.e-titel');
      q.tekst = waarde(card, '.e-tekst');
      q.vragen = [...card.querySelectorAll(':scope > .pf-k-body > .pf-deelvragen > .pf-kaart-edit')].map(leesKaart);
      return q;
    }
    q.vraag = waarde(card, '.e-vraag');
    if (card.pfAudio) q.audio = card.pfAudio;
    const zeg = waarde(card, '.e-voorlees').trim();
    if (zeg) q.voorlees = zeg;
    const p = waarde(card, '.e-punten');
    if (p !== '') q.punten = p;
    const exact = card.querySelector(':scope > .pf-k-body .e-exact');
    if (exact && exact.checked) q.exact = true;
    const regels = s => s.split('\n').map(l => l.trim()).filter(Boolean);
    const split = (l, sep) => { const i = l.indexOf(sep); return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + sep.length).trim()]; };
    if (type === 'meerkeuze') {
      const rijen = [...card.querySelectorAll(':scope > .pf-k-body .pf-optie')];
      q.opties = rijen.map(r => {
        const t = r.querySelector('.pf-optie-tekst').value.trim();
        return r.pfBeeld ? { tekst: t, beeld: r.pfBeeld } : t;
      });
      const juist = rijen.map((r, i) => (r.querySelector('.pf-juist input').checked ? i : -1)).filter(i => i >= 0);
      q.juist = juist.length > 1 ? juist : juist[0];
      if (juist.length > 1) {
        if (waarde(card, '.e-puntenper')) q.puntenPer = waarde(card, '.e-puntenper');
        if (waarde(card, '.e-aantal')) q.aantal = Number(waarde(card, '.e-aantal'));
      }
    } else if (type === 'juistfout') q.juist = waarde(card, '.e-jf') === 'J';
    else if (type === 'invullen') {
      q.tekst = waarde(card, '.e-tekst');
      if (card.querySelector(':scope > .pf-k-body .e-bank').checked) {
        q.bank = true;
        q.extra = waarde(card, '.e-extra').split('/').map(w => w.trim()).filter(Boolean);
      }
    }
    else if (type === 'kort' || type === 'rekenen') {
      q.antwoord = waarde(card, '.e-antwoord');
      q.eenheid = waarde(card, '.e-eenheid');
      if (type === 'rekenen') q.werkPunten = waarde(card, '.e-werkpunten');
      q.breuk = card.querySelector(':scope > .pf-k-body .e-breuk').checked;
      q.vereenvoudigd = card.querySelector(':scope > .pf-k-body .e-vv').checked;
      if (type === 'rekenen' && card.querySelector(':scope > .pf-k-body .e-rooster').checked) Object.assign(q, { rooster: true }, card.pfRooster && card.pfRooster.kol ? card.pfRooster : {});
      else if (type === 'rekenen') q.rooster = false;
    } else if (type === 'verbinden') q.paren = regels(waarde(card, '.e-lijst')).map(l => split(l, '='));
    else if (type === 'ordenen') {
      q.items = [...card.querySelectorAll(':scope > .pf-k-body .pf-optie')].map(r => {
        const t = r.querySelector('.pf-optie-tekst').value.trim();
        return r.pfBeeld ? { tekst: t, beeld: r.pfBeeld } : t;
      });
      if (waarde(card, '.e-puntenper')) q.puntenPer = waarde(card, '.e-puntenper');
    } else if (type === 'dictee') {
      q.vorm = waarde(card, '.e-vorm') || 'woorden';
      q.delen = [...card.querySelectorAll(':scope > .pf-k-body .pf-e-deel')].map(r => ({ tekst: r.querySelector('.e-deel').value.trim(), zin: q.vorm === 'woorden' ? r.querySelector('.e-deelzin').value.trim() : '' }))
        .filter(d => d.tekst).map(d => (d.zin ? d : { tekst: d.tekst }));
      if (!card.querySelector(':scope > .pf-k-body .e-hoofd').checked) q.hoofdletters = false;
      if (card.querySelector(':scope > .pf-k-body .e-lees').checked) q.leestekens = true;
      if (q.vorm === 'zinnen' && waarde(card, '.e-pz')) q.puntenZin = Number(waarde(card, '.e-pz'));
    } else if (type === 'sorteren') {
      const delen = v => v.split('/').map(w => w.trim()).filter(Boolean);
      q.kolommen = [...card.querySelectorAll(':scope > .pf-k-body .pf-e-kol')].map(r => ({ naam: r.querySelector('.e-kolnaam').value.trim(), woorden: delen(r.querySelector('.e-kolwoorden').value) }));
      q.extra = delen(waarde(card, '.e-extra'));
    }
    else if (type === 'tabel') q.rijen = regels(waarde(card, '.e-lijst')).map(cellenVan);
    else if (type === 'aanduiden') {
      q.zones = card.pfZones || [];
      q.verhouding = card.pfVerhouding;
    } else if (type === 'getallenas') {
      for (const k of ['min', 'max', 'stap', 'antwoord']) q[k] = waarde(card, `.e-${k}`);
      q.getallen = waarde(card, '.e-getallen');
      q.breuk = card.querySelector(':scope > .pf-k-body .e-breuk').checked;
    } else if (type === 'markeren') {
      const body = card.querySelector(':scope > .pf-k-body');
      const inb = body.querySelector('.e-inbron');
      if (inb && inb.checked) { q.inBron = true; q.doelen = card.pfDoelen || []; } else q.tekst = waarde(card, '.e-tekst');
      if (body.querySelector('.e-per').value) q.per = body.querySelector('.e-per').value;
      if (body.querySelector('.e-aantal').value) q.aantal = Number(body.querySelector('.e-aantal').value);
      if (card.pfKleuren && card.pfKleuren.length) q.kleuren = card.pfKleuren.map(c => ({ kleur: c.kleur, uitleg: c.uitleg || '' }));
    }
    else if (type === 'tekenen') {
      q.verhouding = card.pfBeeld ? card.pfVerhouding : Number(waarde(card, '.e-hoogte')) || 0.6;
      q.model = waarde(card, '.e-model');
    } else if (type === 'spreken') {
      q.seconden = Number(waarde(card, '.e-seconden'));
      q.model = waarde(card, '.e-model');
    } else if (type === 'open' || type === 'papier') {
      q.model = waarde(card, '.e-model');
      if (type === 'open') q.regels = waarde(card, '.e-regels');
    }
    return q;
  }

  // Een rij van een tabel in cellen, gescheiden door |, maar niet binnen [fiets|velo] of {juist|fout}.
  function cellenVan(regel) {
    const out = [''];
    let diep = 0;
    for (const c of regel) {
      if (c === '[' || c === '{') diep++;
      if (c === ']' || c === '}') diep = Math.max(0, diep - 1);
      if (c === '|' && !diep) out.push(''); else out[out.length - 1] += c;
    }
    return out.map(c => c.trim());
  }

  // Vraag toevoegen: in groepjes, met een icoon en een zinnetje. groepen: [[kop, [[soort, uitleg, icoon?, naam?]]]].
  // onKies(soort) bij een klik; met pdf: true staat er ook "Bladen uit een pdf" (onBladen(bladen)).
  function palet(box, groepen, { onKies, onBladen, pdf = true } = {}) {
    box.innerHTML = groepen.map(([kop, lijst], gi) => `<div class="pf-add-groep"><b>${kop}</b>${lijst.map(([t, uitleg, ic, naam]) => `<button type="button" class="pf-add-k" data-type="${t}"><span class="pf-add-ic">${ic || TYPE_ICONS[t] || '📜'}</span><span><strong>${naam || PfKern.NAMES[t]}</strong><small>${uitleg}</small></span></button>`).join('')}
      ${pdf && gi === groepen.length - 1 ? '<label class="pf-add-k file-button"><span class="pf-add-ic">📄</span><span><strong>Bladen uit een pdf</strong><small>Je blad zoals het is, met vakjes</small></span><input type="file" class="pf-add-blad" accept="application/pdf,image/*" hidden></label>' : ''}</div>`).join('');
    for (const b of box.querySelectorAll('button[data-type]')) b.addEventListener('click', () => onKies(b.dataset.type));
    const f = box.querySelector('.pf-add-blad');
    if (f) f.addEventListener('change', async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try { onBladen(await bladenUit([await alsBron(file)], () => {})); } catch (err) { if (!/geen pagina/.test(err.message)) Ui.melding(err.message); }
    });
  }

  // Een nieuwe, lege vraag van deze soort.
  const nieuw = t => (t === 'bron' ? { type: t, vragen: [] } : { type: t, vraag: DEFAULT_VRAAG[t] });

  return {
    config: o => Object.assign(cfg, o), kaart: vraagKaart, lees: leesKaart, palet, nieuw, alsBron, bladenUit, cellenVan,
    ICONS: TYPE_ICONS, HELP, DEFAULT_VRAAG,
  };
})();
