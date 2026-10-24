// Een leerplandoel (Op.stap) kiezen bij een quizvraag of een oefening.
// Typ een code (2.2.GL6.12) of woorden uit het doel (breuk, deler): eronder verschijnen de passende doelen.
// Gebruikt socket uit host.js of ob-host.js.
const DoelKies = (() => {
  let doelen = [];
  let status = 'laden'; // laden -> klaar | leeg | fout
  let asked = false;
  const fields = new Set();
  const MAX_SHOWN = 12;

  function find(code) {
    return doelen.find(d => d.code === code) || null;
  }

  function describe(d) {
    return `${d.domein} · ${d.tekst}${d.soort === 'plus' ? ' (plusdoel)' : ''}`;
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
        // Alleen de doelen van het leerjaar van de klas; zijn er daarvoor geen, dan alles.
        const mine = res.doelen.filter(d => d.leerjaar === res.leerjaar);
        doelen = mine.length ? mine : res.doelen;
        status = doelen.length ? 'klaar' : 'leeg';
      }
      for (const el of fields) el.refresh();
    });
  }

  // De code uit wat er in het veld staat (de leerkracht kan ook de hele regel plakken).
  function codeOf(value) {
    return String(value || '').trim().split(/\s+/)[0] || '';
  }

  // Doelen waarin elk getypt woord voorkomt, in de code, de tekst, de cluster of het domein.
  function search(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return doelen.filter(d => {
      const hay = `${d.code} ${d.tekst} ${d.cluster} ${d.domein}`.toLowerCase();
      return words.every(w => hay.includes(w));
    });
  }

  // Een veld om een doel te kiezen. onChange(code) wordt opgeroepen als het doel verandert.
  function field(value = '', { label = 'Leerplandoel (mag leeg)', onChange } = {}) {
    load();
    const el = document.createElement('div');
    el.className = 'doel-veld';
    el.innerHTML = `<span class="doel-titel"></span><div class="doel-invoer"><input class="doel" maxlength="200" autocomplete="off" placeholder="Typ een code of een woord, bv. breuk of deler"><div class="doel-keuzes hidden"></div></div><span class="doel-tekst"></span>`;
    el.querySelector('.doel-titel').textContent = label;
    const input = el.querySelector('input');
    const box = el.querySelector('.doel-keuzes');
    input.value = value || '';
    let active = -1;

    function choose(d) {
      input.value = d.code;
      box.classList.add('hidden');
      el.refresh();
      if (onChange) onChange(d.code);
    }

    function showChoices() {
      const q = input.value.trim();
      box.innerHTML = '';
      active = -1;
      if (!q || find(codeOf(q)) || status !== 'klaar') {
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
    return find(code) || (!doelen.length && /^\d/.test(code)) ? code : '';
  }

  return { field, read, find, describe, load };
})();
