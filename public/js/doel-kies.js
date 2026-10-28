// Een leerplandoel (Op.stap) kiezen bij een quizvraag of een oefening.
// Typ een code (2.2.GL6.12) of woorden uit het doel (breuk, deler): eronder verschijnen de passende doelen.
// Standaard de doelen van het leerjaar van de klas; boven de zoekbalk kies je een ander leerjaar (of alle).
// Gebruikt socket uit host.js of ob-host.js.
const DoelKies = (() => {
  let alle = []; // alle doelen van alle leerjaren
  let doelen = []; // de doelen waarin gezocht wordt: die van het gekozen leerjaar
  let leerjaren = [];
  let gekozen = ''; // het gekozen leerjaar, of 'alle'
  let status = 'laden'; // laden -> klaar | leeg | fout
  let asked = false;
  let klasLeerjaar = 0;
  let wachten = [];
  const fields = new Set();
  const keuzes = new Set();
  const MAX_SHOWN = 12;

  function find(code) {
    return alle.find(d => d.code === code) || null;
  }

  const same = (a, b) => String(a) === String(b);

  // "6e leerjaar", "2e leerjaar" ...
  function naam(lj) {
    const l = leerjaren.find(x => same(x.id, lj));
    return l ? l.naam : `${lj}e leerjaar`;
  }

  function describe(d) {
    const lj = same(d.leerjaar, klasLeerjaar) ? '' : ` · ${naam(d.leerjaar)}`;
    return `${d.vak}${lj} · ${d.domein} · ${d.tekst}${d.soort === 'plus' ? ' (plusdoel)' : ''}${d.score === false ? ' (voor de Ronde Tafel, geen score)' : ''}`;
  }

  function filter() {
    doelen = gekozen === 'alle' ? alle : alle.filter(d => same(d.leerjaar, gekozen));
  }

  // Een ander leerjaar kiezen: alle zoekvelden en keuzelijsten volgen.
  function kies(lj) {
    gekozen = lj;
    filter();
    for (const sel of keuzes) sel.value = String(gekozen);
    for (const el of fields) el.refresh();
  }

  function load() {
    if (asked) return;
    asked = true;
    // Antwoordt de server niet (bijvoorbeeld een oude versie die nog draait), dan zeggen we dat.
    const timer = setTimeout(() => {
      if (status !== 'laden') return;
      status = 'fout';
      for (const el of fields) el.refresh();
    }, 5000);
    socket.emit('doelen-get', null, res => {
      clearTimeout(timer);
      if (!res || res.error) {
        status = 'fout';
      } else {
        alle = res.doelen;
        leerjaren = (res.leerjaren || []).filter(l => alle.some(d => same(d.leerjaar, l.id)));
        klasLeerjaar = res.leerjaar;
        // Standaard de doelen van het leerjaar van de klas; zijn er daarvoor geen, dan alles.
        gekozen = leerjaren.some(l => same(l.id, klasLeerjaar)) ? klasLeerjaar : 'alle';
        filter();
        status = alle.length ? 'klaar' : 'leeg';
        for (const sel of keuzes) fillKeuze(sel);
        for (const fn of wachten) fn(klasLeerjaar);
        wachten = [];
      }
      for (const el of fields) el.refresh();
    });
  }

  // De code uit wat er in het veld staat (de leerkracht kan ook de hele regel plakken).
  function codeOf(value) {
    return String(value || '').trim().split(/\s+/)[0] || '';
  }

  // Doelen waarin elk getypt woord voorkomt, in de code, de tekst, de cluster of het domein.
  // Eerst de doelen waarvan het vak of domein een getypt woord is: "nederlands" toont Nederlands, niet eerst Frans ("vertaal naar het Nederlands").
  function search(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const top = d => words.some(w => `${d.vak} ${d.domein}`.toLowerCase().includes(w)) ? 0 : 1;
    return doelen.filter(d => {
      const hay = `${d.code} ${d.tekst} ${d.cluster} ${d.domein} ${d.vak}`.toLowerCase();
      return words.every(w => hay.includes(w));
    }).sort((a, b) => top(a) - top(b));
  }

  // Een veld om een doel te kiezen. onChange(code) wordt opgeroepen als het doel verandert.
  function field(value = '', { label = 'Leerplandoel (mag leeg)', onChange, onChoose } = {}) {
    load();
    const el = document.createElement('div');
    el.className = 'doel-veld';
    el.innerHTML = `<span class="doel-titel"></span><div class="doel-invoer"><input class="doel" maxlength="200" autocomplete="off" placeholder="Typ een code of een woord, bv. breuk, spelling of verkeer"><div class="doel-keuzes hidden"></div></div><span class="doel-tekst"></span>`;
    el.querySelector('.doel-titel').textContent = label;
    const input = el.querySelector('input');
    const box = el.querySelector('.doel-keuzes');
    input.value = value || '';
    let active = -1;

    function choose(d) {
      // Bij meerdere doelen gaat het gekozen doel naar de lijst erboven en wordt het zoekveld weer leeg.
      if (onChoose) {
        input.value = '';
        box.classList.add('hidden');
        el.refresh();
        onChoose(d);
        return;
      }
      input.value = d.code;
      box.classList.add('hidden');
      el.refresh();
      if (onChange) onChange(d.code);
    }

    function showChoices() {
      const q = input.value.trim();
      box.innerHTML = '';
      active = -1;
      if (!q || (!onChoose && find(codeOf(q))) || status !== 'klaar') {
        box.classList.add('hidden');
        return;
      }
      const hits = search(q);
      for (const d of hits.slice(0, MAX_SHOWN)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = '<code></code><span></span>';
        b.querySelector('code').textContent = d.code;
        b.querySelector('span').textContent = describe(d);
        // mousedown, zodat de keuze telt voordat het veld zijn focus verliest.
        b.addEventListener('mousedown', e => {
          e.preventDefault();
          choose(d);
        });
        box.appendChild(b);
      }
      if (hits.length > MAX_SHOWN) {
        const more = document.createElement('p');
        more.className = 'muted small';
        more.textContent = `Nog ${hits.length - MAX_SHOWN} doelen. Typ een woord meer om te zoeken.`;
        box.appendChild(more);
      }
      box.classList.toggle('hidden', !hits.length);
    }

    el.refresh = () => {
      const code = codeOf(input.value);
      const d = find(code);
      let note = '';
      if (status === 'fout') note = 'De leerplandoelen konden niet geladen worden. Sluit het zwarte LANcelot-venster en start LANcelot opnieuw.';
      else if (status === 'leeg') note = 'Er staan nog geen leerplandoelen op deze pc (map doelen).';
      else if (status === 'laden' && code) note = 'De leerplandoelen worden geladen…';
      else if (d) note = describe(d);
      else if (code && !search(input.value).length) note = 'Geen doel gevonden. Probeer een ander woord.';
      el.querySelector('.doel-tekst').textContent = note;
      if (document.activeElement === input) showChoices();
    };

    input.addEventListener('input', () => {
      el.refresh();
      showChoices();
      if (onChange) onChange(DoelKies.read(el));
    });
    input.addEventListener('focus', showChoices);
    input.addEventListener('blur', () => box.classList.add('hidden'));
    input.addEventListener('keydown', e => {
      const buttons = [...box.querySelectorAll('button')];
      if (box.classList.contains('hidden') || !buttons.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = (active + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length;
        buttons.forEach((b, i) => b.classList.toggle('active', i === active));
        buttons[active].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        buttons[Math.max(0, active)].dispatchEvent(new MouseEvent('mousedown'));
      } else if (e.key === 'Escape') {
        box.classList.add('hidden');
      }
    });
    fields.add(el);
    el.refresh();
    return el;
  }

  // De gekozen doelcode, of leeg als het veld leeg is of het doel niet bestaat.
  function read(el) {
    const code = codeOf(el.querySelector('input').value);
    return find(code) || (!alle.length && /^\d/.test(code)) ? code : '';
  }

  function fillKeuze(sel) {
    sel.innerHTML = '';
    for (const l of leerjaren) sel.add(new Option(same(l.id, klasLeerjaar) ? `${l.naam} (mijn klas)` : l.naam, String(l.id)));
    sel.add(new Option('Alle leerjaren', 'alle'));
    sel.value = String(gekozen);
  }

  // De keuzelijst "Doelen van": het leerjaar van de klas, of een ander (bijvoorbeeld om doelen van vorig jaar te herhalen).
  function leerjaarKeuze() {
    load();
    const label = document.createElement('label');
    label.className = 'doel-leerjaar';
    label.textContent = 'Doelen van ';
    const sel = document.createElement('select');
    sel.addEventListener('change', () => {
      const l = leerjaren.find(x => String(x.id) === sel.value);
      kies(l ? l.id : 'alle');
    });
    label.appendChild(sel);
    keuzes.add(sel);
    if (status === 'klaar') fillKeuze(sel);
    return label;
  }

  // Meerdere doelen kiezen, bijvoorbeeld voor een les met een paar doelen. el.codes() geeft de gekozen codes.
  function multi({ label = 'Leerplandoelen (mag leeg, een les mag meerdere doelen hebben)', onChange } = {}) {
    const el = document.createElement('div');
    el.className = 'doel-multi';
    const chips = document.createElement('div');
    chips.className = 'doel-chips';
    let codes = [];
    const paint = () => {
      chips.innerHTML = '';
      for (const code of codes) {
        const d = find(code);
        const chip = document.createElement('span');
        chip.className = 'doel-chip';
        chip.innerHTML = '<code></code><span></span><button type="button" title="Doel weghalen">✕</button>';
        chip.querySelector('code').textContent = code;
        chip.querySelector('span').textContent = d ? d.tekst : '';
        chip.querySelector('button').addEventListener('click', () => {
          codes = codes.filter(c => c !== code);
          paint();
          if (onChange) onChange(codes);
        });
        chips.appendChild(chip);
      }
      const input = el.querySelector('.doel-veld input');
      if (input) input.placeholder = codes.length ? 'Nog een doel? Typ een code of een woord' : 'Typ een code of een woord, bv. breuk, spelling of verkeer';
    };
    const search = field('', {
      label,
      onChoose: d => {
        if (!codes.includes(d.code)) codes.push(d.code);
        paint();
        if (onChange) onChange(codes);
      },
    });
    el.append(leerjaarKeuze(), search, chips);
    el.codes = () => codes.slice();
    el.zet = lijst => {
      codes = (lijst || []).slice();
      paint();
    };
    return el;
  }

  // Het leerjaar van de klas (Mijn klas), zodra de server het doorgaf.
  function leerjaar(fn) {
    load();
    if (klasLeerjaar) fn(klasLeerjaar);
    else wachten.push(fn);
  }

  // Het stuk van de AI-prompt over de gekozen doelen. wat = 'vragen' of 'oefeningen'.
  function prompt(codes, wat) {
    const list = codes.map(find).filter(Boolean);
    if (!list.length) return '';
    const bron = `het Vlaamse leerplan Op.stap (${[...new Set(list.map(d => d.vak))].join(', ')}, ${[...new Set(list.map(d => naam(d.leerjaar)))].join(', ')})`;
    if (list.length === 1) return `\nDe ${wat} oefenen dit leerplandoel uit ${bron}: "${list[0].tekst}" Maak alleen ${wat} die precies dit doel oefenen.\n`;
    return `\nDe ${wat} oefenen deze leerplandoelen uit ${bron}:\n${list.map(d => `- ${d.code}: ${d.tekst}`).join('\n')}\nVerdeel de ${wat} evenwichtig over deze doelen. Zet bij elk${wat === 'vragen' ? 'e vraag' : 'e oefening'} in "doel" de code van het doel dat ze oefent, bijvoorbeeld "doel": "${list[0].code}".\n`;
  }

  // Na de AI: elk item krijgt een doel. Eén doel: dat doel. Meerdere: het doel dat de AI koos, als het bij de gekozen doelen hoort.
  function apply(items, codes) {
    for (const item of items) {
      if (codes.length === 1) item.doel = item.doel || codes[0];
      else if (codes.length > 1 && !codes.includes(item.doel)) item.doel = '';
    }
  }

  return { field, multi, prompt, apply, read, find, describe, load, leerjaar, naam, leerjaarKeuze };
})();
